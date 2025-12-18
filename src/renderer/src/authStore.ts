// Global Auth Store for Toolbox
// Manages authentication state across all tools

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.qhrd.online'
const SESSION_KEY = 'toolbox_session'

export interface User {
    id: string
    email: string
}

export interface Session {
    access_token: string
    user: User
}

type AuthListener = (session: Session | null) => void

class AuthStore {
    private session: Session | null = null
    private listeners: Set<AuthListener> = new Set()

    constructor() {
        // Load session from localStorage on init
        this.loadSession()
    }

    private loadSession(): void {
        try {
            const stored = localStorage.getItem(SESSION_KEY)
            if (stored) {
                this.session = JSON.parse(stored)
            }
        } catch {
            this.session = null
        }
    }

    private saveSession(): void {
        if (this.session) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(this.session))
        } else {
            localStorage.removeItem(SESSION_KEY)
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.session))
    }

    // Subscribe to auth changes
    subscribe(listener: AuthListener): () => void {
        this.listeners.add(listener)
        // Call immediately with current state
        listener(this.session)
        // Return unsubscribe function
        return () => this.listeners.delete(listener)
    }

    // Get current session
    getSession(): Session | null {
        return this.session
    }

    // Get current user
    getUser(): User | null {
        return this.session?.user || null
    }

    // Check if logged in
    isLoggedIn(): boolean {
        return this.session !== null
    }

    // Get auth token
    getToken(): string | null {
        return this.session?.access_token || null
    }

    // Login
    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                return { success: false, error: 'Server nicht erreichbar' }
            }

            const data = await response.json()

            if (!response.ok) {
                return { success: false, error: data.error || 'Login fehlgeschlagen' }
            }

            if (!data.session || !data.user) {
                return { success: false, error: 'Ungültige Server-Antwort' }
            }

            this.session = {
                access_token: data.session.access_token,
                user: {
                    id: data.user.id,
                    email: data.user.email
                }
            }
            this.saveSession()
            this.notifyListeners()

            return { success: true }
        } catch (error) {
            const message = (error as Error).message
            if (message.includes('Unexpected token')) {
                return { success: false, error: 'Server nicht erreichbar' }
            }
            return { success: false, error: message }
        }
    }

    // Register
    async register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                return { success: false, error: 'Server nicht erreichbar' }
            }

            const data = await response.json()

            if (!response.ok) {
                return { success: false, error: data.error || 'Registrierung fehlgeschlagen' }
            }

            if (!data.session || !data.user) {
                return { success: false, error: 'Ungültige Server-Antwort' }
            }

            this.session = {
                access_token: data.session.access_token,
                user: {
                    id: data.user.id,
                    email: data.user.email
                }
            }
            this.saveSession()
            this.notifyListeners()

            return { success: true }
        } catch (error) {
            const message = (error as Error).message
            if (message.includes('Unexpected token')) {
                return { success: false, error: 'Server nicht erreichbar' }
            }
            return { success: false, error: message }
        }
    }

    // Logout
    logout(): void {
        this.session = null
        this.saveSession()
        this.notifyListeners()
    }
}

// Singleton instance
export const authStore = new AuthStore()
