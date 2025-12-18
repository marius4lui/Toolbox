import { authStore } from './authStore'

export interface Settings {
    theme: 'dark' | 'light' | 'system'
    language: 'de' | 'en'
    imageCompressor?: {
        defaultQuality: number
        defaultFormat: string
    }
    imageConverter?: {
        defaultOutputFormat: string
    }
    qrGenerator?: {
        defaultSize: number
    }
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'system',
    language: 'de',
    imageCompressor: {
        defaultQuality: 80,
        defaultFormat: 'jpeg'
    }
}

type SettingsListener = (settings: Settings) => void

class SettingsStore {
    private settings: Settings = { ...DEFAULT_SETTINGS }
    private listeners: SettingsListener[] = []
    private initialized = false

    constructor() {
        this.init()
    }

    async init() {
        if (this.initialized) return

        try {
            // Load settings from main process
            const storedSettings = await window.api.getSettings()
            this.settings = { ...DEFAULT_SETTINGS, ...storedSettings }
            this.applyTheme(this.settings.theme)
            this.initialized = true
            this.notifyListeners()
        } catch (error) {
            console.error('Failed to load settings:', error)
            // Fallback to defaults
            this.initialized = true
        }
    }

    getSettings(): Settings {
        return { ...this.settings }
    }

    get<K extends keyof Settings>(key: K): Settings[K] {
        return this.settings[key]
    }

    async set<K extends keyof Settings>(key: K, value: Settings[K]) {
        this.settings[key] = value
        this.notifyListeners()

        // Apply side effects immediately
        if (key === 'theme') {
            this.applyTheme(value as Settings['theme'])
        }

        try {
            await window.api.setSetting(key, value)
        } catch (error) {
            console.error(`Failed to save setting ${key}:`, error)
        }
    }

    async reset() {
        this.settings = { ...DEFAULT_SETTINGS }
        this.notifyListeners()
        this.applyTheme('system')
        await window.api.resetSettings()
    }

    subscribe(listener: SettingsListener) {
        this.listeners.push(listener)
        // Initial call
        if (this.initialized) {
            listener(this.settings)
        }
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener)
        }
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.settings))
    }

    private applyTheme(theme: Settings['theme']) {
        const root = document.documentElement

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.setAttribute('data-theme', isDark ? 'dark' : 'light')
        } else {
            root.setAttribute('data-theme', theme)
        }
    }
}

export const settingsStore = new SettingsStore()
