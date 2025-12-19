import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFile, writeFile } from 'fs/promises'
import Store from 'electron-store'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp')

const store = new Store({
    defaults: {
        theme: 'system',
        language: 'de',
        imageCompressor: {
            defaultQuality: 80,
            defaultFormat: 'jpeg'
        }
    }
})

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#000000',
        titleBarStyle: 'hiddenInset',
        frame: process.platform === 'darwin',
        icon: join(__dirname, '../../resources/icon.png'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// IPC Handlers for tools
ipcMain.handle('dialog:openFile', async (_event, options: { filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: options.filters || [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
        return null
    }

    const filePath = result.filePaths[0]
    const buffer = await readFile(filePath)
    const metadata = await sharp(buffer).metadata()

    return {
        path: filePath,
        name: filePath.split(/[\\/]/).pop(),
        buffer: buffer.toString('base64'),
        size: buffer.length,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
    }
})

ipcMain.handle('dialog:saveFile', async (_event, options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showSaveDialog({
        defaultPath: options.defaultPath,
        filters: options.filters || [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })

    return result.canceled ? null : result.filePath
})

ipcMain.handle('image:compress', async (_event, options: {
    inputBuffer: string,
    quality: number,
    format: 'jpeg' | 'png' | 'webp' | 'avif',
    maxWidth?: number,
    maxHeight?: number
}) => {
    const buffer = Buffer.from(options.inputBuffer, 'base64')
    let pipeline = sharp(buffer)

    // Resize if dimensions specified
    if (options.maxWidth || options.maxHeight) {
        pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
        })
    }

    // Apply format and quality
    switch (options.format) {
        case 'jpeg':
            pipeline = pipeline.jpeg({ quality: options.quality })
            break
        case 'png':
            pipeline = pipeline.png({ quality: options.quality })
            break
        case 'webp':
            pipeline = pipeline.webp({ quality: options.quality })
            break
        case 'avif':
            pipeline = pipeline.avif({ quality: options.quality })
            break
    }

    const outputBuffer = await pipeline.toBuffer()
    const metadata = await sharp(outputBuffer).metadata()

    return {
        buffer: outputBuffer.toString('base64'),
        size: outputBuffer.length,
        width: metadata.width,
        height: metadata.height,
        format: options.format
    }
})

ipcMain.handle('file:save', async (_event, options: { filePath: string; data: string }) => {
    const buffer = Buffer.from(options.data, 'base64')
    await writeFile(options.filePath, buffer)
    return true
})

// Settings Handlers
ipcMain.handle('settings:get', () => store.store)

ipcMain.handle('settings:set', (_event, key: string, value: any) => {
    store.set(key, value)
    return true
})

ipcMain.handle('settings:reset', () => {
    store.clear()
    return true
})

// Window control handlers
ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
})

ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
        win.unmaximize()
    } else {
        win?.maximize()
    }
})

ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close()
})

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.toolbox.app')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
