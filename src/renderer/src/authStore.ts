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
    private isValidating: boolean = false

    constructor() {
        // Load session from localStorage on init and validate
        this.loadSession()
    }

    private loadSession(): void {
        try {
            const stored = localStorage.getItem(SESSION_KEY)
            if (stored) {
                this.session = JSON.parse(stored)
                // Validate token with server
                this.validateToken()
            }
        } catch {
            this.session = null
        }
    }

    // Validate token with server
    private async validateToken(): Promise<void> {
        if (!this.session || this.isValidating) return

        this.isValidating = true

        try {
            const response = await fetch(`${API_BASE}/api/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.session.access_token}`
                }
            })

            if (!response.ok) {
                // Token is invalid or expired - log out
                console.log('Token validation failed, logging out')
                this.session = null
                this.saveSession()
                this.notifyListeners()
            }
        } catch (error) {
            console.error('Token validation error:', error)
            // Network error - don't log out, might just be offline
        } finally {
            this.isValidating = false
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

    // Account Management
    async changePassword(password: string): Promise<{ success: boolean; error?: string }> {
        if (!this.session) return { success: false, error: 'Nicht eingeloggt' }
        try {
            const response = await fetch(`${API_BASE}/api/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.access_token}`
                },
                body: JSON.stringify({ password })
            })
            const data = await response.json()
            return response.ok ? { success: true } : { success: false, error: data.error }
        } catch {
            return { success: false, error: 'Verbindungsfehler' }
        }
    }

    async changeEmail(email: string): Promise<{ success: boolean; error?: string }> {
        if (!this.session) return { success: false, error: 'Nicht eingeloggt' }
        try {
            const response = await fetch(`${API_BASE}/api/auth/change-email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.access_token}`
                },
                body: JSON.stringify({ email })
            })
            const data = await response.json()
            if (response.ok) {
                // Update local session email
                this.session.user.email = email
                this.saveSession()
                this.notifyListeners()
                return { success: true }
            }
            return { success: false, error: data.error }
        } catch {
            return { success: false, error: 'Verbindungsfehler' }
        }
    }

    async deleteAccount(): Promise<{ success: boolean; error?: string }> {
        if (!this.session) return { success: false, error: 'Nicht eingeloggt' }
        try {
            const response = await fetch(`${API_BASE}/api/auth/delete-account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.session.access_token}`
                }
            })
            const data = await response.json()
            if (response.ok) {
                this.logout()
                return { success: true }
            }
            return { success: false, error: data.error }
        } catch {
            return { success: false, error: 'Verbindungsfehler' }
        }
    }
}

// Singleton instance
export const authStore = new AuthStore()
