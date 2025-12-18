// Link Weiterleiter Tool Component
// URL shortening with 31-day expiration and restore functionality
import { icons } from '../icons'
import { authStore } from '../authStore'

interface Link {
  hash: string
  shortUrl: string
  targetUrl: string
  clicks: number
  isActive: boolean
  createdAt: string
  expiresAt: string
}

interface State {
  // Tabs
  activeTab: 'create' | 'mylinks'

  // Create Link
  targetUrl: string
  shortUrl: string | null
  hash: string | null
  expiresAt: string | null
  isGenerating: boolean
  error: string | null
  copied: boolean
  success: string | null

  // My Links
  links: Link[]
  linksLoading: boolean
  showExpired: boolean

  // Edit Modal
  editingLink: Link | null
  editUrl: string
}

// API Base URL for the redirect service
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.qhrd.online'

export function createLinkShortener(): HTMLElement {
  const state: State = {
    activeTab: 'create',
    targetUrl: '',
    shortUrl: null,
    hash: null,
    expiresAt: null,
    isGenerating: false,
    error: null,
    copied: false,
    success: null,
    links: [],
    linksLoading: false,
    showExpired: true,
    editingLink: null,
    editUrl: ''
  }

  const container = document.createElement('div')
  container.className = 'link-shortener fade-in'

  const unsubscribe = authStore.subscribe(() => {
    render()
  })

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === container) {
          unsubscribe()
          observer.disconnect()
        }
      })
    })
  })
  if (container.parentNode) {
    observer.observe(container.parentNode, { childList: true })
  }

  function render(): void {
    const session = authStore.getSession()

    container.innerHTML = `
      <!-- Info Banner -->
      <div class="expiry-info-banner">
        ${icons.info}
        <span>Links laufen automatisch nach <strong>31 Tagen</strong> ab. Eingeloggte Benutzer können abgelaufene Links wiederherstellen.</span>
      </div>

      <!-- Tabs -->
      <div class="link-tabs">
        <button class="link-tab ${state.activeTab === 'create' ? 'link-tab--active' : ''}" data-linktab="create">
          ${icons.plus} Link erstellen
        </button>
        <button class="link-tab ${state.activeTab === 'mylinks' ? 'link-tab--active' : ''}" data-linktab="mylinks" ${!session ? 'disabled title="Login erforderlich"' : ''}>
          ${icons.list} Meine Links ${session ? `(${state.links.length})` : '🔒'}
        </button>
      </div>

      ${state.activeTab === 'create' ? renderCreateTab(session) : renderMyLinksTab(session)}

      ${state.editingLink ? renderEditModal() : ''}

      <style>
        .link-shortener {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .link-shortener svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .expiry-info-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 12px;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .expiry-info-banner svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: var(--accent-primary);
          margin-top: 2px;
        }
        .expiry-info-banner strong {
          color: var(--accent-primary);
        }
        .link-tabs {
          display: inline-flex;
          gap: 0;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 4px;
        }
        .link-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .link-tab:hover:not(:disabled):not(.link-tab--active) {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .link-tab--active {
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 2px 8px rgba(0, 112, 243, 0.3);
        }
        .link-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .link-tab svg {
          width: 16px;
          height: 16px;
        }
        .create-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .url-input-group {
          display: flex;
          gap: 0.5rem;
        }
        .url-input-group input {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          color: var(--text-primary);
        }
        .url-input-group input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
        .url-input-group .btn svg {
          width: 18px;
          height: 18px;
        }
        .result-card {
          padding: 1.5rem;
          background: var(--bg-tertiary);
          border-radius: 12px;
          border: 1px solid var(--border-primary);
        }
        .result-card__url {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .result-card__url code {
          flex: 1;
          padding: 0.75rem 1rem;
          background: var(--bg-primary);
          border-radius: 8px;
          font-family: monospace;
          font-size: 1rem;
          color: var(--accent-primary);
        }
        .result-card__expiry {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .result-card__expiry svg {
          width: 14px;
          height: 14px;
        }
        .result-card__actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .result-card__actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .result-card__actions .btn svg {
          width: 14px;
          height: 14px;
        }
        .links-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .links-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
        }
        .links-toggle input {
          width: 18px;
          height: 18px;
          accent-color: var(--accent-primary);
        }
        .links-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .link-card {
          padding: 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .link-card:hover {
          border-color: var(--accent-primary);
        }
        .link-card--expired {
          opacity: 0.7;
          border-color: var(--status-warning);
        }
        .link-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .link-card__url {
          font-family: monospace;
          color: var(--accent-primary);
          text-decoration: none;
        }
        .link-card__url:hover {
          text-decoration: underline;
        }
        .link-card__badge {
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .link-card__badge--active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        .link-card__badge--expired {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .link-card__target {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .link-card__stats {
          display: flex;
          gap: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .link-card__stats span {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .link-card__stats svg {
          width: 12px;
          height: 12px;
        }
        .link-card__actions {
          display: flex;
          gap: 0.5rem;
        }
        .link-card__actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }
        .link-card__actions .btn svg {
          width: 14px;
          height: 14px;
        }
        .btn--restore {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }
        .btn--restore:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }
        .guest-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .guest-notice svg {
          width: 18px;
          height: 18px;
          color: #f59e0b;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .guest-notice a {
          color: var(--accent-primary);
        }
        .edit-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .edit-modal__content {
          background: var(--bg-secondary);
          padding: 2rem;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
        }
        .edit-modal__title {
          margin: 0 0 1.5rem 0;
        }
        .edit-modal__form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .edit-modal__form input {
          padding: 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          color: var(--text-primary);
        }
        .edit-modal__actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .btn--icon svg {
          width: 16px;
          height: 16px;
        }
      </style>
    `

    attachEventListeners()
  }

  function renderCreateTab(session: ReturnType<typeof authStore.getSession>): string {
    return `
      <div class="create-section">
        <div class="url-input-group">
          <input 
            type="url" 
            id="url-input" 
            placeholder="https://example.com"
            value="${escapeHtml(state.targetUrl)}"
          >
          <button class="btn btn--primary" id="generate-btn" ${state.isGenerating ? 'disabled' : ''}>
            ${state.isGenerating ? '<div class="spinner"></div>' : `${icons.zap} Kürzen`}
          </button>
        </div>

        ${!session ? `
          <div class="guest-notice">
            ${icons.alertTriangle}
            <span>Als Gast: 1 Link/Stunde, keine Verwaltung. <a href="#" id="login-link">Jetzt einloggen</a> für unbegrenzte Links.</span>
          </div>
        ` : ''}

        ${state.error ? `<div class="status status--error">${state.error}</div>` : ''}
        ${state.success ? `<div class="status status--success">${state.success}</div>` : ''}

        ${state.shortUrl ? `
          <div class="result-card">
            <div class="result-card__url">
              <code>${state.shortUrl}</code>
              <button class="btn btn--secondary btn--icon" id="copy-url-btn" title="URL kopieren">
                ${state.copied ? icons.check : icons.copy}
              </button>
            </div>
            <div class="result-card__expiry">
              ${icons.clock}
              <span>Gültig bis: ${state.expiresAt ? formatDate(state.expiresAt) : '31 Tage'}</span>
            </div>
            <div class="result-card__actions">
              <button class="btn btn--secondary" id="reset-btn">
                ${icons.refreshCw} Neuer Link
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  function renderMyLinksTab(session: ReturnType<typeof authStore.getSession>): string {
    if (!session) {
      return `<div class="empty-state"><p>Bitte logge dich ein, um deine Links zu verwalten.</p></div>`
    }

    if (state.linksLoading) {
      return `<div class="empty-state"><div class="spinner"></div><p>Lade Links...</p></div>`
    }

    const activeLinks = state.links.filter(l => l.isActive && new Date(l.expiresAt) >= new Date())
    const expiredLinks = state.links.filter(l => !l.isActive || new Date(l.expiresAt) < new Date())
    const displayLinks = state.showExpired ? state.links : activeLinks

    if (state.links.length === 0) {
      return `<div class="empty-state"><p>Du hast noch keine Links erstellt.</p></div>`
    }

    return `
      <div class="links-header">
        <span>${activeLinks.length} aktiv, ${expiredLinks.length} abgelaufen</span>
        <label class="links-toggle">
          <input type="checkbox" id="show-expired" ${state.showExpired ? 'checked' : ''}>
          Abgelaufene anzeigen
        </label>
      </div>
      <div class="links-list">
        ${displayLinks.map(link => {
      const isExpired = !link.isActive || new Date(link.expiresAt) < new Date()
      return `
            <div class="link-card ${isExpired ? 'link-card--expired' : ''}">
              <div class="link-card__header">
                <a href="${link.shortUrl}" target="_blank" rel="noopener" class="link-card__url">
                  ${link.shortUrl}
                </a>
                <span class="link-card__badge ${isExpired ? 'link-card__badge--expired' : 'link-card__badge--active'}">
                  ${isExpired ? 'Abgelaufen' : 'Aktiv'}
                </span>
              </div>
              <div class="link-card__target">→ ${escapeHtml(link.targetUrl)}</div>
              <div class="link-card__stats">
                <span>${icons.mousePointer} ${link.clicks} Klicks</span>
                <span>${icons.calendar} ${formatDate(link.createdAt)}</span>
                <span>${icons.clock} ${isExpired ? 'Abgelaufen' : `Bis ${formatDate(link.expiresAt)}`}</span>
              </div>
              <div class="link-card__actions">
                ${isExpired ? `
                  <button class="btn btn--restore btn--small" data-restore="${link.hash}">
                    ${icons.refreshCw} Wiederherstellen
                  </button>
                ` : `
                  <button class="btn btn--secondary btn--small" data-edit="${link.hash}">
                    ${icons.edit} Bearbeiten
                  </button>
                `}
                <button class="btn btn--danger btn--small" data-delete="${link.hash}">
                  ${icons.trash} Löschen
                </button>
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
            <label>Kurz-URL</label>
            <input type="text" value="${state.editingLink.shortUrl}" disabled>
            <label>Ziel-URL</label>
            <input type="url" id="edit-url-input" value="${escapeHtml(state.editUrl)}" required>
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
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function attachEventListeners(): void {
    // Login link
    const loginLink = container.querySelector('#login-link') as HTMLAnchorElement
    loginLink?.addEventListener('click', (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('toolbox:navigate', { detail: { view: 'login' } }))
    })

    // Link tabs
    container.querySelectorAll('.link-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const newTab = (tab as HTMLElement).dataset.linktab as 'create' | 'mylinks'
        if (newTab === 'mylinks' && !authStore.isLoggedIn()) return
        state.activeTab = newTab
        if (newTab === 'mylinks') loadLinks()
        render()
      })
    })

    // URL input
    const urlInput = container.querySelector('#url-input') as HTMLInputElement
    urlInput?.addEventListener('input', () => { state.targetUrl = urlInput.value })
    urlInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGenerate() })

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
        setTimeout(() => { state.copied = false; render() }, 2000)
      }
    })

    // Reset button
    const resetBtn = container.querySelector('#reset-btn') as HTMLButtonElement
    resetBtn?.addEventListener('click', () => {
      state.targetUrl = ''
      state.shortUrl = null
      state.hash = null
      state.expiresAt = null
      state.error = null
      state.success = null
      render()
    })

    // Show expired toggle
    const showExpiredCheckbox = container.querySelector('#show-expired') as HTMLInputElement
    showExpiredCheckbox?.addEventListener('change', () => {
      state.showExpired = showExpiredCheckbox.checked
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

    // Restore buttons
    container.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hash = (btn as HTMLElement).dataset.restore
        if (hash) handleRestoreLink(hash)
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
      if (e.target === editModal) { state.editingLink = null; render() }
    })

    const cancelEditBtn = container.querySelector('#cancel-edit-btn') as HTMLButtonElement
    cancelEditBtn?.addEventListener('click', () => { state.editingLink = null; render() })

    const editForm = container.querySelector('#edit-form') as HTMLFormElement
    editForm?.addEventListener('submit', handleEditSubmit)

    const editUrlInput = container.querySelector('#edit-url-input') as HTMLInputElement
    editUrlInput?.addEventListener('input', () => { state.editUrl = editUrlInput.value })
  }

  async function loadLinks(): Promise<void> {
    const token = authStore.getToken()
    if (!token) return

    state.linksLoading = true
    render()

    try {
      const response = await fetch(`${API_BASE}/api/links`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Laden')
      state.links = data.links
    } catch (error) {
      console.error('Load links error:', error)
      state.links = []
    } finally {
      state.linksLoading = false
      render()
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!state.targetUrl || state.isGenerating) return

    try {
      new URL(state.targetUrl)
    } catch {
      state.error = 'Bitte gib eine gültige URL ein (z.B. https://example.com)'
      render()
      return
    }

    state.isGenerating = true
    state.error = null
    state.success = null
    render()

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = authStore.getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE}/api/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: state.targetUrl })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Erstellen')

      state.hash = data.hash
      state.shortUrl = data.shortUrl
      state.expiresAt = data.expiresAt
      state.success = 'Link erfolgreich erstellt!'

    } catch (error) {
      console.error('Error:', error)
      state.error = (error as Error).message || 'Fehler beim Generieren.'
    } finally {
      state.isGenerating = false
      render()
    }
  }

  async function handleEditSubmit(e: Event): Promise<void> {
    e.preventDefault()
    const token = authStore.getToken()
    if (!state.editingLink || !token) return

    try {
      new URL(state.editUrl)
    } catch { return }

    try {
      const response = await fetch(`${API_BASE}/api/links/${state.editingLink.hash}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  async function handleRestoreLink(hash: string): Promise<void> {
    const token = authStore.getToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/api/links/${hash}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Wiederherstellen')
      }

      await loadLinks()
    } catch (error) {
      console.error('Restore error:', error)
    }
  }

  async function handleDeleteLink(hash: string): Promise<void> {
    const token = authStore.getToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE}/api/links/${hash}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  render()
  return container
}
