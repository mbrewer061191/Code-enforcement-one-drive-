import { Case, Property } from './types';

export interface AppData {
    cases: Case[];
    properties: Property[];
    lastUpdated: string;
}

let fileHandle: FileSystemFileHandle | null = null;

export const setFileHandle = (handle: FileSystemFileHandle) => {
    fileHandle = handle;
};

export const getFileHandle = () => fileHandle;

export const createNewDatabase = async (): Promise<FileSystemFileHandle> => {
    const opts: SaveFilePickerOptions = {
        suggestedName: 'code-enforcement-data.json',
        types: [{
            description: 'JSON Database File',
            accept: { 'application/json': ['.json'] },
        }],
    };
    const handle = await window.showSaveFilePicker(opts);
    fileHandle = handle;

    // Initialize with empty data
    const initialData: AppData = {
        cases: [],
        properties: [],
        lastUpdated: new Date().toISOString()
    };
    await saveToHandle(initialData);

    return handle;
};

export const openDatabase = async (): Promise<FileSystemFileHandle> => {
    const [handle] = await window.showOpenFilePicker({
        types: [{
            description: 'JSON Database File',
            accept: { 'application/json': ['.json'] },
        }],
        multiple: false,
    });
    fileHandle = handle;
    return handle;
};

export const saveToHandle = async (data: AppData) => {
    if (!fileHandle) throw new Error("No file handle available.");

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
};

export const loadFromHandle = async (): Promise<AppData> => {
    if (!fileHandle) throw new Error("No file handle available.");

    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
};
