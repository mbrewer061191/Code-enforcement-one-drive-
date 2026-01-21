import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig, clearConfig, getAccessToken } from '../config';
import { GOOGLE_CONSOLE_URL, GOOGLE_API_LIBRARY_URL } from '../constants';

const AdminView: React.FC<{ onSetupComplete: () => void }> = ({ onSetupComplete }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [clientId, setClientId] = useState('');
    const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    useEffect(() => {
        const loadAdminConfig = async () => {
            setIsLoadingConfig(true);
            const cfg = await getConfig(true); // Force refresh
            setConfig(cfg);
            setClientId(cfg?.google?.clientId || '');
            setIsLoadingConfig(false);
        };
        loadAdminConfig();
    }, []);

    const handleSaveSettings = async () => {
        if (!clientId.trim()) {
            setStatus({ ok: false, message: 'Client ID cannot be empty.' });
            return;
        }
        
        const newConfig: AppConfig = {
            ...config,
            google: {
                ...config?.google,
                clientId: clientId.trim(),
            }
        };
        
        try {
            await saveConfig(newConfig);
            setConfig(newConfig);
            setStatus({ ok: true, message: 'Settings saved successfully!' });
        } catch (e: any) {
            setStatus({ ok: false, message: `Failed to save settings: ${e.message}`});
        }
    };

    const handleCreateFile = async () => {
        setIsLoading(true);
        setStatus(null);
        try {
            const token = await getAccessToken();
            const metadata = { name: 'Code Enforcement App Data', mimeType: 'application/vnd.google-apps.spreadsheet' };
            
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata)
            });

            if (!response.ok) throw new Error(await response.text());

            const file = await response.json();
            const newConfig = { ...config, google: { ...config!.google, fileId: file.id } };
            
            await saveConfig(newConfig);
            setConfig(newConfig);
            
            setStatus({ ok: true, message: `Successfully created file: ${file.name}` });
            onSetupComplete();
        } catch (err: any) {
            setStatus({ ok: false, message: `File creation failed: ${err.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearConfig = async () => {
        if (window.confirm('Are you sure? This will remove your configuration from this device and Google Drive.')) {
            await clearConfig();
            setConfig(null);
            setClientId('');
            setStatus(null);
            onSetupComplete(); // Re-trigger app state check
        }
    };
    
    if (isLoadingConfig) {
        return <div className="card"><div className="loader" style={{margin: 'auto', borderTopColor: 'var(--primary-color)', borderLeftColor: 'var(--primary-color)'}}></div></div>;
    }

    return (
        <div className="card">
            <h2>Admin Setup</h2>
            <div className="form-group">
                <label htmlFor="google-client-id">1. Google Cloud Client ID</label>
                <p className="helper-text">This is required for the app to function. It is stored on this device. You must enter it once per browser/device you use.</p>
                 <div className="input-with-button">
                    <input id="google-client-id" type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="your-client-id.apps.googleusercontent.com" />
                </div>
                 <div className="warning-box" style={{padding: '0.75rem', marginTop: '1rem', textAlign: 'left'}}>
                    <p style={{marginBottom: '0.5rem'}}>To fix sign-in issues (especially on mobile), add this exact URL to your allowed list:</p>
                    <div className="copyable-row">
                        <code>{window.location.origin}</code>
                        <button className="button copy-button" onClick={() => navigator.clipboard.writeText(window.location.origin)}>Copy</button>
                    </div>
                    <p style={{marginTop: '0.5rem'}}>You <strong>must</strong> add this to the "Authorized JavaScript origins" list for your Client ID in the <a href={GOOGLE_CONSOLE_URL} target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.</p>
                </div>
                 <div className="warning-box" style={{padding: '0.75rem', marginBottom: '1rem', marginTop: '1rem'}}>
                    <strong>Important:</strong> Before proceeding, ensure the following APIs are enabled in your <a href={GOOGLE_API_LIBRARY_URL} target="_blank" rel="noopener noreferrer">Google Cloud project</a>:
                    <ul style={{paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.9rem'}}>
                        <li>Google Drive API</li>
                        <li>Google Sheets API</li>
                        <li>Google Docs API</li>
                    </ul>
                </div>
                 <button onClick={handleSaveSettings} className="button">Save Client ID</button>
            </div>
            
            <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label>2. Data File (Synced)</label>
                <p className="helper-text">The app stores all case data in a single Google Sheet. This setting syncs across your devices.</p>
                <p className="helper-text" style={{fontWeight: 'bold', color: 'var(--primary-color)', marginTop: '0.5rem'}}>
                    Important: To ensure data syncs correctly, you must be logged into the same Google Account on all your devices (PC, mobile, etc.).
                </p>
                {config?.google?.fileId ? (
                    <div className="status-message ok">Data file is configured. File ID: {config.google.fileId}</div>
                ) : (
                    <button className="button" onClick={handleCreateFile} disabled={!config?.google?.clientId || isLoading}>
                        {isLoading ? <span className="loader" /> : 'Create & Use New Data File'}
                    </button>
                )}
            </div>

            {status && <div className={`status-message ${status.ok ? 'ok' : 'error'}`}>{status.message}</div>}
            
            <div className="form-group" style={{marginTop: '2rem'}}>
                <label>Reset Configuration</label>
                <p className="helper-text">This will clear your Client ID from this device and attempt to delete the synced config file from Google Drive.</p>
                <button className="button danger-action" onClick={handleClearConfig}>Clear All Settings</button>
            </div>
        </div>
    );
};

export default AdminView;