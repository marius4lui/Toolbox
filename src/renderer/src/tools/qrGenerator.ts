// Link & QR Code Generator Tool Component
import { icons } from '../icons'

interface Link {
  hash: string
  shortUrl: string
  targetUrl: string
  clicks: number
  isActive: boolean
  createdAt: string
  expiresAt: string
}

interface Session {
  access_token: string
  user: {
    id: string
    email: string
  }
}

interface State {
  // Auth
  session: Session | null
  authOpen: boolean
  authTab: 'login' | 'register'
  authEmail: string
  authPassword: string
  authLoading: boolean
  authError: string | null

  // Tabs
  activeTab: 'create' | 'mylinks'

  // Create Link
  targetUrl: string
  shortUrl: string | null
  hash: string | null
  qrDataUrl: string | null
  expiresAt: string | null
  isGenerating: boolean
  error: string | null
  copied: boolean

  // My Links
  links: Link[]
  linksLoading: boolean

  // Edit Modal
  editingLink: Link | null
  editUrl: string
}

// API Base URL for the redirect service
// Set VITE_API_URL=http://localhost:3000 in .env for local development
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.qhrd.online'

// Storage keys
const SESSION_KEY = 'toolbox_session'

export function createQrGenerator(): HTMLElement {
  // State
  const state: State = {
    session: loadSession(),
    authOpen: false,
    authTab: 'login',
    authEmail: '',
    authPassword: '',
    authLoading: false,
    authError: null,

    activeTab: 'create',

    targetUrl: '',
    shortUrl: null,
    hash: null,
    qrDataUrl: null,
    expiresAt: null,
    isGenerating: false,
    error: null,
    copied: false,

    links: [],
    linksLoading: false,

    editingLink: null,
    editUrl: ''
  }

  // Create container
  const container = document.createElement('div')
  container.className = 'qr-generator fade-in'

  // Load session from localStorage
  function loadSession(): Session | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  // Save session to localStorage
  function saveSession(session: Session | null): void {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  // Render function
  function render(): void {
    container.innerHTML = `
      <!-- Auth Section -->
      <div class="auth-section">
        <div class="auth-header" id="auth-toggle">
          <div class="auth-header__left">
            ${icons.user}
            ${state.session
        ? `<span>Eingeloggt als</span>`
        : `<span>Login für unbegrenzte Links</span>`
      }
          </div>
          ${state.session ? `
            <div class="auth-user">
              <span class="auth-user__email">${escapeHtml(state.session.user.email)}</span>
              <button class="btn btn--secondary btn--small" id="logout-btn">Logout</button>
            </div>
          ` : `
            <span class="auth-header__icon ${state.authOpen ? 'auth-header__icon--open' : ''}">
              ${icons.chevronDown}
            </span>
          `}
        </div>
        
        ${!state.session ? `
          <div class="auth-content ${state.authOpen ? 'auth-content--open' : ''}">
            <div class="auth-tabs">
              <button class="auth-tab ${state.authTab === 'login' ? 'auth-tab--active' : ''}" data-tab="login">Login</button>
              <button class="auth-tab ${state.authTab === 'register' ? 'auth-tab--active' : ''}" data-tab="register">Registrieren</button>
            </div>
            
            <form class="auth-form" id="auth-form">
              <input 
                type="email" 
                class="auth-input" 
                placeholder="E-Mail" 
                id="auth-email"
                value="${escapeHtml(state.authEmail)}"
                required
              >
              <input 
                type="password" 
                class="auth-input" 
                placeholder="Passwort" 
                id="auth-password"
                value=""
                minlength="6"
                required
              >
              ${state.authError ? `<div class="status status--error">${state.authError}</div>` : ''}
              <button type="submit" class="btn btn--primary" ${state.authLoading ? 'disabled' : ''}>
                ${state.authLoading ? '<div class="spinner"></div>' : (state.authTab === 'login' ? 'Einloggen' : 'Registrieren')}
              </button>
            </form>
          </div>
        ` : ''}
      </div>

      <!-- Tabs -->
      <div class="link-tabs">
        <button class="link-tab ${state.activeTab === 'create' ? 'link-tab--active' : ''}" data-linktab="create">
          Link erstellen
        </button>
        <button class="link-tab ${state.activeTab === 'mylinks' ? 'link-tab--active' : ''}" data-linktab="mylinks" ${!state.session ? 'disabled title="Login erforderlich"' : ''}>
          Meine Links ${state.session ? `(${state.links.length})` : '🔒'}
        </button>
      </div>

      ${state.activeTab === 'create' ? renderCreateTab() : renderMyLinksTab()}

      ${state.editingLink ? renderEditModal() : ''}
    `

    attachEventListeners()
  }

  function renderCreateTab(): string {
    return `
      <!-- Create Link Section -->
      <div class="qr-input-section">
        <label class="settings__label">Ziel-URL eingeben</label>
        <div class="qr-input-wrapper">
          <input 
            type="url" 
            class="qr-input" 
            id="url-input" 
            placeholder="https://example.com"
            value="${escapeHtml(state.targetUrl)}"
          >
          <button class="btn btn--primary" id="generate-btn" ${state.isGenerating ? 'disabled' : ''}>
            ${state.isGenerating
        ? '<div class="spinner"></div>'
        : `${icons.zap} Erstellen`
      }
          </button>
        </div>
      </div>

      ${!state.session ? `
        <div class="guest-warning">
          ${icons.alertTriangle}
          <span>Als Gast kannst du nur 1 Link pro Stunde erstellen. Login für unbegrenzte Links.</span>
        </div>
      ` : ''}

      ${state.error ? `
        <div class="status status--error">${state.error}</div>
      ` : ''}

      ${state.qrDataUrl ? `
        <div class="qr-result">
          <div class="qr-preview">
            <img src="${state.qrDataUrl}" alt="QR Code" class="qr-image">
          </div>
          
          <div class="qr-info">
            <div class="qr-short-url">
              <span class="qr-short-url__label">Kurz-URL:</span>
              <code class="qr-short-url__value">${state.shortUrl}</code>
              <button class="btn btn--secondary btn--icon" id="copy-url-btn" title="URL kopieren">
                ${state.copied ? icons.check : icons.copy}
              </button>
            </div>
            
            ${state.expiresAt ? `
              <div class="qr-expiry">
                Gültig bis: ${formatDate(state.expiresAt)}
              </div>
            ` : ''}
            
            <div class="qr-actions">
              <button class="btn btn--secondary" id="download-png-btn">
                ${icons.download} PNG
              </button>
              <button class="btn btn--secondary" id="copy-qr-btn">
                ${icons.copy} QR kopieren
              </button>
              <button class="btn btn--secondary" id="reset-btn">
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `
  }

  function renderMyLinksTab(): string {
    if (!state.session) {
      return `
        <div class="links-empty">
          <p>Bitte logge dich ein, um deine Links zu verwalten.</p>
        </div>
      `
    }

    if (state.linksLoading) {
      return `
        <div class="links-empty">
          <div class="spinner"></div>
          <p>Lade Links...</p>
        </div>
      `
    }

    if (state.links.length === 0) {
      return `
        <div class="links-empty">
          <p>Du hast noch keine Links erstellt.</p>
        </div>
      `
    }

    return `
      <div class="links-dashboard">
        ${state.links.map(link => {
      const isExpired = !link.isActive || new Date(link.expiresAt) < new Date()
      return `
            <div class="link-item ${isExpired ? 'link-item--expired' : ''}">
              <div class="link-item__header">
                <a href="${link.shortUrl}" target="_blank" rel="noopener" class="link-item__url">
                  ${link.shortUrl}
                </a>
                <span class="link-item__badge ${isExpired ? 'link-item__badge--expired' : ''}">
                  ${isExpired ? 'Abgelaufen' : 'Aktiv'}
                </span>
              </div>
              <div class="link-item__target">→ ${escapeHtml(link.targetUrl)}</div>
              <div class="link-item__meta">
                <div class="link-item__stats">
                  <span>${link.clicks} Klicks</span>
                  <span>Erstellt: ${formatDate(link.createdAt)}</span>
                  <span>Läuft ab: ${formatDate(link.expiresAt)}</span>
                </div>
                <div class="link-item__actions">
                  <button class="btn btn--secondary btn--small" data-edit="${link.hash}" ${isExpired ? 'disabled' : ''}>
                    Bearbeiten
                  </button>
                  <button class="btn btn--danger btn--small" data-delete="${link.hash}">
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          `
    }).join('')}
      </div>
    `
  }

  function renderEditModal(): string {
    if (!state.editingLink) return ''

    return `
      <div class="edit-modal" id="edit-modal">
        <div class="edit-modal__content">
          <h3 class="edit-modal__title">Link bearbeiten</h3>
          <form class="edit-modal__form" id="edit-form">
            <label class="settings__label">Kurz-URL</label>
            <input 
              type="text" 
              class="auth-input" 
              value="${state.editingLink.shortUrl}" 
              disabled
            >
            <label class="settings__label">Ziel-URL</label>
            <input 
              type="url" 
              class="auth-input" 
              id="edit-url-input"
              value="${escapeHtml(state.editUrl)}"
              required
            >
            <div class="edit-modal__actions">
              <button type="button" class="btn btn--secondary" id="cancel-edit-btn">Abbrechen</button>
              <button type="submit" class="btn btn--primary">Speichern</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Event listeners
  function attachEventListeners(): void {
    // Auth toggle
    const authToggle = container.querySelector('#auth-toggle') as HTMLElement
    authToggle?.addEventListener('click', (e) => {
      // Don't toggle if clicking logout button
      if ((e.target as HTMLElement).id === 'logout-btn') return
      if (!state.session) {
        state.authOpen = !state.authOpen
        render()
      }
    })

    // Logout button
    const logoutBtn = container.querySelector('#logout-btn') as HTMLButtonElement
    logoutBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      handleLogout()
    })

    // Auth tabs
    container.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        state.authTab = (tab as HTMLElement).dataset.tab as 'login' | 'register'
        state.authError = null
        render()
      })
    })

    // Auth form
    const authForm = container.querySelector('#auth-form') as HTMLFormElement
    authForm?.addEventListener('submit', handleAuth)

    const authEmailInput = container.querySelector('#auth-email') as HTMLInputElement
    authEmailInput?.addEventListener('input', () => {
      state.authEmail = authEmailInput.value
    })

    const authPasswordInput = container.querySelector('#auth-password') as HTMLInputElement
    authPasswordInput?.addEventListener('input', () => {
      state.authPassword = authPasswordInput.value
    })

    // Link tabs
    container.querySelectorAll('.link-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const newTab = (tab as HTMLElement).dataset.linktab as 'create' | 'mylinks'
        if (newTab === 'mylinks' && !state.session) return
        state.activeTab = newTab
        if (newTab === 'mylinks') {
          loadLinks()
        }
        render()
      })
    })

    // URL input
    const urlInput = container.querySelector('#url-input') as HTMLInputElement
    urlInput?.addEventListener('input', () => {
      state.targetUrl = urlInput.value
    })
    urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleGenerate()
    })

    // Generate button
    const generateBtn = container.querySelector('#generate-btn') as HTMLButtonElement
    generateBtn?.addEventListener('click', handleGenerate)

    // Copy URL button
    const copyUrlBtn = container.querySelector('#copy-url-btn') as HTMLButtonElement
    copyUrlBtn?.addEventListener('click', () => {
      if (state.shortUrl) {
        navigator.clipboard.writeText(state.shortUrl)
        state.copied = true
        render()
        setTimeout(() => {
          state.copied = false
          render()
        }, 2000)
      }
    })

    // Download PNG
    const downloadPngBtn = container.querySelector('#download-png-btn') as HTMLButtonElement
    downloadPngBtn?.addEventListener('click', handleDownloadPng)

    // Copy QR
    const copyQrBtn = container.querySelector('#copy-qr-btn') as HTMLButtonElement
    copyQrBtn?.addEventListener('click', handleCopyQr)

    // Reset
    const resetBtn = container.querySelector('#reset-btn') as HTMLButtonElement
    resetBtn?.addEventListener('click', () => {
      state.targetUrl = ''
      state.shortUrl = null
      state.hash = null
      state.qrDataUrl = null
      state.expiresAt = null
      state.error = null
      render()
    })

    // Edit buttons
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hash = (btn as HTMLElement).dataset.edit
        const link = state.links.find(l => l.hash === hash)
        if (link) {
          state.editingLink = link
          state.editUrl = link.targetUrl
          render()
        }
      })
    })

    // Delete buttons
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hash = (btn as HTMLElement).dataset.delete
        if (hash) handleDeleteLink(hash)
      })
    })

    // Edit modal
    const editModal = container.querySelector('#edit-modal') as HTMLElement
    editModal?.addEventListener('click', (e) => {
      if (e.target === editModal) {
        state.editingLink = null
        render()
      }
    })

    const cancelEditBtn = container.querySelector('#cancel-edit-btn') as HTMLButtonElement
    cancelEditBtn?.addEventListener('click', () => {
      state.editingLink = null
      render()
    })

    const editForm = container.querySelector('#edit-form') as HTMLFormElement
    editForm?.addEventListener('submit', handleEditSubmit)

    const editUrlInput = container.querySelector('#edit-url-input') as HTMLInputElement
    editUrlInput?.addEventListener('input', () => {
      state.editUrl = editUrlInput.value
    })
  }

  // Auth handlers
  async function handleAuth(e: Event): Promise<void> {
    e.preventDefault()
    if (state.authLoading) return

    state.authLoading = true
    state.authError = null
    render()

    try {
      const endpoint = state.authTab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.authEmail,
          password: state.authPassword
        })
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server nicht erreichbar. Bitte später erneut versuchen.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentifizierung fehlgeschlagen')
      }

      if (!data.session || !data.user) {
        throw new Error('Ungültige Server-Antwort')
      }

      state.session = {
        access_token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }
      saveSession(state.session)
      state.authOpen = false
      state.authEmail = ''
      state.authPassword = ''

    } catch (error) {
      const errorMessage = (error as Error).message
      if (errorMessage.includes("Unexpected token '<'") || errorMessage.includes('Unexpected token')) {
        state.authError = 'Server nicht erreichbar. Bitte stelle sicher, dass der Server läuft.'
      } else {
        state.authError = errorMessage
      }
    } finally {
      state.authLoading = false
      render()
    }
  }

  async function handleLogout(): Promise<void> {
    state.session = null
    saveSession(null)
    state.links = []
    state.activeTab = 'create'
    render()
  }

  // Load user links
  async function loadLinks(): Promise<void> {
    if (!state.session) return

    state.linksLoading = true
    render()

    try {
      const response = await fetch(`${API_BASE}/api/links`, {
        headers: {
          'Authorization': `Bearer ${state.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden')
      }

      state.links = data.links

    } catch (error) {
      console.error('Load links error:', error)
      state.links = []
    } finally {
      state.linksLoading = false
      render()
    }
  }

  // Generate link
  async function handleGenerate(): Promise<void> {
    if (!state.targetUrl || state.isGenerating) return

    // Validate URL
    try {
      new URL(state.targetUrl)
    } catch {
      state.error = 'Bitte gib eine gültige URL ein (z.B. https://example.com)'
      render()
      return
    }

    state.isGenerating = true
    state.error = null
    render()

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (state.session) {
        headers['Authorization'] = `Bearer ${state.session.access_token}`
      }

      const response = await fetch(`${API_BASE}/api/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: state.targetUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      state.hash = data.hash
      state.shortUrl = data.shortUrl
      state.expiresAt = data.expiresAt

      // Generate QR code
      const qrDataUrl = await generateQrCode(data.shortUrl)
      state.qrDataUrl = qrDataUrl

    } catch (error) {
      console.error('Error:', error)
      state.error = (error as Error).message || 'Fehler beim Generieren. Bitte versuche es erneut.'
    } finally {
      state.isGenerating = false
      render()
    }
  }

  // Edit link
  async function handleEditSubmit(e: Event): Promise<void> {
    e.preventDefault()
    if (!state.editingLink || !state.session) return

    try {
      new URL(state.editUrl)
    } catch {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/links/${state.editingLink.hash}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.session.access_token}`
        },
        body: JSON.stringify({ url: state.editUrl })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      state.editingLink = null
      await loadLinks()

    } catch (error) {
      console.error('Edit error:', error)
    }
  }

  // Delete link
  async function handleDeleteLink(hash: string): Promise<void> {
    if (!state.session) return

    try {
      const response = await fetch(`${API_BASE}/api/links/${hash}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${state.session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Löschen')
      }

      state.links = state.links.filter(l => l.hash !== hash)
      render()

    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  // Generate QR code using canvas
  async function generateQrCode(text: string): Promise<string> {
    // @ts-expect-error - QRCode is loaded globally
    if (typeof QRCode !== 'undefined') {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas')
        // @ts-expect-error - QRCode is loaded globally
        QRCode.toCanvas(canvas, text, {
          width: 300,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#000000'
          }
        }, (error: Error | null) => {
          if (error) reject(error)
          else resolve(canvas.toDataURL('image/png'))
        })
      })
    }

    // Fallback: Use API
    const size = 300
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=000000&color=ffffff`
  }

  // Download PNG
  async function handleDownloadPng(): Promise<void> {
    if (!state.qrDataUrl) return

    const link = document.createElement('a')
    link.download = `qr-${state.hash}.png`
    link.href = state.qrDataUrl
    link.click()
  }

  // Copy QR to clipboard
  async function handleCopyQr(): Promise<void> {
    if (!state.qrDataUrl) return

    try {
      const response = await fetch(state.qrDataUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
    } catch {
      state.error = 'QR-Code kopieren wird von diesem Browser nicht unterstützt'
      render()
    }
  }

  // Escape HTML
  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Initial render
  render()

  return container
}
