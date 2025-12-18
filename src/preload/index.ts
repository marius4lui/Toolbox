import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    // File dialogs
    openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
        ipcRenderer.invoke('dialog:openFile', options || {}),

    saveFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
        ipcRenderer.invoke('dialog:saveFile', options || {}),

    // Image compression
    compressImage: (options: {
        inputBuffer: string,
        quality: number,
        format: 'jpeg' | 'png' | 'webp' | 'avif',
        maxWidth?: number,
        maxHeight?: number
    }) => ipcRenderer.invoke('image:compress', options),

    // File operations
    saveToFile: (options: { filePath: string; data: string }) =>
        ipcRenderer.invoke('file:save', options),

    // Window controls
    minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
    closeWindow: () => ipcRenderer.invoke('window:close')
}

// Expose APIs to renderer
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-expect-error - Fallback for non-isolated context
    window.electron = electronAPI
    // @ts-expect-error
    window.api = api
}
