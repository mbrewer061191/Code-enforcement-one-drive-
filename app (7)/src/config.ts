import { AppConfig } from './types';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive', // Full access to read/write config, templates, and create files
  'https://www.googleapis.com/auth/spreadsheets', // R/W data in the sheet
  'https://www.googleapis.com/auth/documents', // Modify the copied notice document
];
const LOCAL_CONFIG_KEY = 'code-enforcement-local-config-v1';
const CONFIG_FILE_NAME = 'code-enforcement-app-config.json';

let accessToken: string | null = null;
let expiresAt = 0;
let configCache: AppConfig | null = null;
let configPromise: Promise<AppConfig | null> | null = null;


async function loadGsiScript(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return;
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity script.'));
    document.head.appendChild(script);
  });
}

export async function getAccessToken(): Promise<string> {
  await loadGsiScript();
  const now = Date.now();
  if (accessToken && now < expiresAt) return accessToken;

  const localConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
  const clientId = localConfigStr ? JSON.parse(localConfigStr).google?.clientId : null;
  if (!clientId) throw { message: 'Google Client ID is not configured.', code: 'missing_client_id' };

  return new Promise<string>((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES.join(' '),
      callback: (resp: any) => {
        if (resp && resp.access_token) {
          accessToken = resp.access_token;
          expiresAt = Date.now() + (resp.expires_in - 300) * 1000; // Refresh 5 mins early
          resolve(accessToken);
        } else {
          const code = resp?.error || 'unknown_error';
          let message = `Failed to get Google access token. Reason: ${code}.`;
          if (code === 'popup_closed') message = 'The Google sign-in window was closed before completing.';
          if (code === 'access_denied') message = 'Permission to access Google Drive/Sheets was denied.';
          reject({ message, code });
        }
      },
      error_callback: (err: any) => {
         const code = err?.type || 'unknown_error';
         let message = err?.message || 'An unknown error occurred during authentication.';
         if (code === 'popup_closed_by_user') message = 'The Google sign-in window was closed before completing.';
         reject({ message, code });
      }
    });
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

export function clearAccessToken() {
  if ((window as any).google?.accounts?.oauth2 && accessToken) {
    (window as any).google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  expiresAt = 0;
  configCache = null;
  configPromise = null;
}

async function findConfigFile(token: string): Promise<string | null> {
    const query = `name='${CONFIG_FILE_NAME}' and trashed=false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to search for config file in Google Drive.');
    const data = await response.json();
    return data.files?.[0]?.id || null;
}

export function getConfig(forceRefresh: boolean = false): Promise<AppConfig | null> {
    if (!forceRefresh && configCache) return Promise.resolve(configCache);
    if (!forceRefresh && configPromise) return configPromise;

    configPromise = (async (): Promise<AppConfig | null> => {
        const localConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
        const localConfig: AppConfig = localConfigStr ? JSON.parse(localConfigStr) : {};

        try {
            const token = await getAccessToken();
            const configFileId = await findConfigFile(token);

            if (!configFileId) {
                configCache = localConfig;
                return configCache;
            }

            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${configFileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 404) return localConfig;
                throw new Error(`Failed to fetch config file content (status: ${response.status}).`);
            }
            
            const syncedConfig = await response.json();
            
            configCache = {
                google: { ...syncedConfig.google, ...localConfig.google }
            };
            return configCache;
        } catch (error) {
            console.warn("Failed to load synced configuration, falling back to local-only.", error);
            configCache = localConfig;
            return configCache;
        }
    })();
    
    return configPromise;
}

export async function saveConfig(config: AppConfig): Promise<void> {
    const localConfig = { google: { clientId: config.google?.clientId || '' } };
    const syncedConfig = { 
        google: { 
            fileId: config.google?.fileId, 
            templateUrls: config.google?.templateUrls, 
            envelopeTemplateUrl: config.google?.envelopeTemplateUrl,
            certificateOfMailTemplateUrl: config.google?.certificateOfMailTemplateUrl,
            statementOfCostTemplateUrl: config.google?.statementOfCostTemplateUrl,
            noticeOfLienTemplateUrl: config.google?.noticeOfLienTemplateUrl,
            certificateOfLienTemplateUrl: config.google?.certificateOfLienTemplateUrl,
        } 
    };

    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
    
    if (!config.google?.clientId) {
        console.warn("Cannot save synced config without a Client ID.");
        configCache = config;
        return;
    }

    try {
        const token = await getAccessToken();
        const configFileId = await findConfigFile(token);
        
        const metadata = { name: CONFIG_FILE_NAME, mimeType: 'application/json' };
        const blob = new Blob([JSON.stringify(syncedConfig, null, 2)], { type: 'application/json' });
        
        const body = new FormData();
        body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        body.append('file', blob);

        let url = 'https://www.googleapis.com/upload/drive/v3/files';
        let method = 'POST';

        if (configFileId) {
            url += `/${configFileId}?uploadType=multipart`;
            method = 'PATCH';
        } else {
            url += `?uploadType=multipart`;
        }

        const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body });

        if (!response.ok) {
            throw new Error(`Failed to save config to Drive: ${await response.text()}`);
        }
        
        configCache = config;
    } catch (error) {
        console.error("Failed to save synced config.", error);
        throw error;
    }
}

export async function clearConfig(): Promise<void> {
    const oldLocalConfigStr = localStorage.getItem(LOCAL_CONFIG_KEY);
    localStorage.removeItem(LOCAL_CONFIG_KEY);

    if (oldLocalConfigStr) {
        try {
            const token = await getAccessToken();
            const configFileId = await findConfigFile(token);
            if (configFileId) {
                await fetch(`https://www.googleapis.com/drive/v3/files/${configFileId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (e) {
            console.warn("Could not delete cloud config file, may not have been accessible.", e);
        }
    }
    clearAccessToken();
}