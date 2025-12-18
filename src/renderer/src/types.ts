// Type definitions for the Toolbox app

export interface Tool {
    id: string
    name: string
    description: string
    icon: string
    component: () => HTMLElement
}

export interface ImageFile {
    path: string
    name: string
    buffer: string
    size: number
    width?: number
    height?: number
    format?: string
}

export interface CompressedImage {
    buffer: string
    size: number
    width?: number
    height?: number
    format: string
}

export interface CompressOptions {
    quality: number
    format: 'jpeg' | 'png' | 'webp' | 'avif'
    maxWidth?: number
    maxHeight?: number
}

// Extend Window for API
declare global {
    interface Window {
        api: {
            openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<ImageFile | null>
            saveFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
            compressImage: (options: { inputBuffer: string } & CompressOptions) => Promise<CompressedImage>
            saveToFile: (options: { filePath: string; data: string }) => Promise<boolean>
            minimizeWindow: () => Promise<void>
            maximizeWindow: () => Promise<void>
            closeWindow: () => Promise<void>
        }
    }
}
