import { Case, Property } from './types';

export interface AppData {
    cases: Case[];
    properties: Property[];
    lastUpdated: string;
}

let fileHandle: FileSystemFileHandle | null = null;
let memoryData: AppData | null = null; // Fallback for devices without FS API

export const isFileSystemAccessSupported = () => {
    return 'showOpenFilePicker' in window;
};

export const setFileHandle = (handle: FileSystemFileHandle) => {
    fileHandle = handle;
};

export const getFileHandle = () => fileHandle;

export const createNewDatabase = async (): Promise<FileSystemFileHandle | void> => {
    if (isFileSystemAccessSupported()) {
        const opts = {
            suggestedName: 'code-enforcement-data.json',
            types: [{
                description: 'JSON Database File',
                accept: { 'application/json': ['.json'] },
            }],
        };
        // Cast window to any to avoid TS errors if types are missing
        const handle = await (window as any).showSaveFilePicker(opts);
        fileHandle = handle;

        // Initialize with empty data
        const initialData: AppData = {
            cases: [],
            properties: [],
            lastUpdated: new Date().toISOString()
        };
        await saveToHandle(initialData);

        return handle;
    } else {
        // Fallback: Initialize memory data
        memoryData = {
            cases: [],
            properties: [],
            lastUpdated: new Date().toISOString()
        };
        return;
    }
};

export const openDatabase = async (): Promise<FileSystemFileHandle | void> => {
    if (isFileSystemAccessSupported()) {
        const [handle] = await (window as any).showOpenFilePicker({
            types: [{
                description: 'JSON Database File',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false,
        });
        fileHandle = handle;
        return handle;
    } else {
        // Fallback: Use input type="file"
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    try {
                        const text = await file.text();
                        memoryData = JSON.parse(text);
                        fileHandle = null; // Ensure we are in memory mode
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error("No file selected"));
                }
            };
            input.click();
        });
    }
};

export const saveToHandle = async (data: AppData) => {
    if (isFileSystemAccessSupported()) {
        if (!fileHandle) throw new Error("No file handle available.");
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    } else {
        // Fallback: Just update memory
        memoryData = data;
    }
};

export const loadFromHandle = async (): Promise<AppData> => {
    if (isFileSystemAccessSupported()) {
        if (!fileHandle) throw new Error("No file handle available.");
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } else {
        if (!memoryData) throw new Error("No data loaded.");
        return memoryData;
    }
};

export const exportDatabase = () => {
    if (!memoryData) return;
    const blob = new Blob([JSON.stringify(memoryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code-enforcement-data.json';
    a.click();
    URL.revokeObjectURL(url);
};

