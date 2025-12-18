// Main Application Entry Point
import './styles/global.css'
import { icons } from './icons'
import { toolRegistry, getToolById } from './toolRegistry'
import { authStore, Session } from './authStore'
import { settingsStore } from './settingsStore'

// Special views (not in tool registry)
type SpecialView = 'home' | 'login' | 'account' | 'settings' | null

class ToolboxApp {
  private container: HTMLElement
  private currentToolId: string | null = null
  private currentView: SpecialView = 'home'
  private mainContent: HTMLElement | null = null

  constructor() {
    this.container = document.getElementById('app')!
    this.render()

    // Subscribe to auth changes
    authStore.subscribe(() => this.updateAuthUI())

    // Subscribe to settings changes
    settingsStore.subscribe(() => {
      if (this.currentView === 'settings') {
        this.renderSettingsView()
      }
    })

    // Start with Home view
    this.navigateToView('home')
  }

  private render(): void {
    const user = authStore.getUser()

    this.container.innerHTML = `
      <!-- Titlebar -->
      <div class="titlebar">
        <div class="titlebar__controls">
          <button class="titlebar__btn titlebar__btn--close" id="btn-close"></button>
          <button class="titlebar__btn titlebar__btn--minimize" id="btn-minimize"></button>
          <button class="titlebar__btn titlebar__btn--maximize" id="btn-maximize"></button>
        </div>
        <div class="titlebar__brand">
          <img src="./assets/logo.png" alt="Toolbox Logo" class="titlebar__logo">
          <div class="titlebar__title">Toolbox</div>
        </div>
        <div class="titlebar__auth" id="auth-area">
          ${user ? `
            <button class="auth-btn auth-btn--user" id="btn-account" title="${user.email}">
              ${icons.user}
              <span class="auth-btn__email">${user.email.split('@')[0]}</span>
            </button>
          ` : `
            <button class="auth-btn" id="btn-login">
              ${icons.user}
              <span>Login</span>
            </button>
          `}
        </div>
      </div>

      <!-- Main Layout -->
      <div class="layout">
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar__logo" id="btn-logo" title="Home">
            <img src="./assets/logo.png" alt="Toolbox" class="sidebar__logo-img">
          </div>
          <nav class="sidebar__nav" id="sidebar-nav">
            <button class="sidebar__item ${this.currentView === 'home' ? 'sidebar__item--active' : ''}" id="btn-home" title="Home">
              <span class="sidebar__icon">${icons.home}</span>
            </button>
            ${toolRegistry.map(tool => `
              <button class="sidebar__item ${this.currentToolId === tool.id ? 'sidebar__item--active' : ''}" data-tool-id="${tool.id}" title="${tool.name}">
                <span class="sidebar__icon">${tool.icon}</span>
              </button>
            `).join('')}
          </nav>
          <div class="sidebar__spacer"></div>
          <nav class="sidebar__nav">
            ${user ? `
              <button class="sidebar__item ${this.currentView === 'account' ? 'sidebar__item--active' : ''}" id="btn-sidebar-account" title="Mein Konto">
                <span class="sidebar__icon">${icons.user}</span>
              </button>
            ` : `
              <button class="sidebar__item ${this.currentView === 'login' ? 'sidebar__item--active' : ''}" id="btn-sidebar-login" title="Login">
                <span class="sidebar__icon">${icons.user}</span>
              </button>
            `}
            <button class="sidebar__item ${this.currentView === 'settings' ? 'sidebar__item--active' : ''}" id="btn-settings" title="Einstellungen">
              <span class="sidebar__icon">${icons.settings}</span>
            </button>
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="main">
          <header class="main__header">
            <h1 class="main__title" id="tool-title">Toolbox</h1>
            <p class="main__subtitle" id="tool-subtitle">Wähle ein Tool aus der Seitenleiste</p>
          </header>
          <div class="main__content" id="main-content">
            <!-- Tool content will be rendered here -->
          </div>
        </main>
      </div>
    `

    this.mainContent = document.getElementById('main-content')
    this.attachEventListeners()
  }

  private attachEventListeners(): void {
    // Window controls
    document.getElementById('btn-close')?.addEventListener('click', () => {
      window.api.closeWindow()
    })

    document.getElementById('btn-minimize')?.addEventListener('click', () => {
      window.api.minimizeWindow()
    })

    document.getElementById('btn-maximize')?.addEventListener('click', () => {
      window.api.maximizeWindow()
    })

    // Home navigation
    document.getElementById('btn-home')?.addEventListener('click', () => {
      this.navigateToView('home')
    })

    document.getElementById('btn-logo')?.addEventListener('click', () => {
      this.navigateToView('home')
    })

    // Settings navigation
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.navigateToView('settings')
    })

    // Auth buttons
    document.getElementById('btn-login')?.addEventListener('click', () => {
      this.navigateToView('login')
    })

    document.getElementById('btn-account')?.addEventListener('click', () => {
      this.navigateToView('account')
    })

    document.getElementById('btn-sidebar-login')?.addEventListener('click', () => {
      this.navigateToView('login')
    })

    document.getElementById('btn-sidebar-account')?.addEventListener('click', () => {
      this.navigateToView('account')
    })

    // Sidebar navigation
    document.querySelectorAll('[data-tool-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool-id')
        if (toolId) {
          this.navigateToTool(toolId)
        }
      })
    })
  }

  private updateAuthUI(): void {
    // Re-render the entire app to update auth state
    const currentTool = this.currentToolId
    const currentView = this.currentView
    this.render()

    if (currentView) {
      this.navigateToView(currentView)
    } else if (currentTool) {
      this.navigateToTool(currentTool)
    }
  }

  private navigateToView(view: SpecialView): void {
    if (!view) return

    this.currentView = view
    this.currentToolId = null

    // Re-render to update sidebar active states
    this.render()

    // Update header and render view content
    const titleEl = document.getElementById('tool-title')
    const subtitleEl = document.getElementById('tool-subtitle')

    switch (view) {
      case 'home':
        if (titleEl) titleEl.textContent = 'Willkommen'
        if (subtitleEl) subtitleEl.textContent = 'Deine Werkzeugsammlung für den Alltag'
        this.renderHomeView()
        break
      case 'login':
        if (titleEl) titleEl.textContent = 'Login'
        if (subtitleEl) subtitleEl.textContent = 'Melde dich an oder registriere dich'
        this.renderLoginView()
        break
      case 'account':
        if (titleEl) titleEl.textContent = 'Mein Konto'
        if (subtitleEl) subtitleEl.textContent = 'Kontoeinstellungen und Profil'
        this.renderAccountView()
        break
      case 'settings':
        if (titleEl) titleEl.textContent = 'Einstellungen'
        if (subtitleEl) subtitleEl.textContent = 'App konfigurieren'
        this.renderSettingsView()
        break
    }
  }

  private renderLoginView(): void {
    if (!this.mainContent) return

    this.mainContent.innerHTML = `
      <div class="auth-view fade-in">
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="auth-tab auth-tab--active" data-auth-tab="login">Login</button>
            <button class="auth-tab" data-auth-tab="register">Registrieren</button>
          </div>
          
          <form class="auth-form" id="auth-form">
            <input type="email" class="auth-input" id="auth-email" placeholder="E-Mail" required>
            <input type="password" class="auth-input" id="auth-password" placeholder="Passwort" minlength="6" required>
            <div class="auth-error" id="auth-error" style="display: none;"></div>
            <button type="submit" class="btn btn--primary btn--full" id="auth-submit">
              Einloggen
            </button>
          </form>
          
          <p class="auth-hint">
            Mit dem Login erhältst du Zugriff auf unbegrenzte Links und kannst deine Links verwalten.
          </p>
        </div>
      </div>
    `

    let isLogin = true

    // Tab switching
    this.mainContent.querySelectorAll('[data-auth-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = (tab as HTMLElement).dataset.authTab
        isLogin = tabType === 'login'

        this.mainContent?.querySelectorAll('[data-auth-tab]').forEach(t => {
          t.classList.toggle('auth-tab--active', (t as HTMLElement).dataset.authTab === tabType)
        })

        const submitBtn = this.mainContent?.querySelector('#auth-submit')
        if (submitBtn) submitBtn.textContent = isLogin ? 'Einloggen' : 'Registrieren'
      })
    })

    // Form submit
    const form = this.mainContent.querySelector('#auth-form') as HTMLFormElement
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()

      const email = (this.mainContent?.querySelector('#auth-email') as HTMLInputElement).value
      const password = (this.mainContent?.querySelector('#auth-password') as HTMLInputElement).value
      const errorEl = this.mainContent?.querySelector('#auth-error') as HTMLElement
      const submitBtn = this.mainContent?.querySelector('#auth-submit') as HTMLButtonElement

      submitBtn.innerHTML = '<div class="spinner"></div>'
      submitBtn.disabled = true
      errorEl.style.display = 'none'

      const result = isLogin
        ? await authStore.login(email, password)
        : await authStore.register(email, password)

      if (result.success) {
        // Navigate to first tool after successful login
        if (toolRegistry.length > 0) {
          this.navigateToTool(toolRegistry[0].id)
        }
      } else {
        errorEl.textContent = result.error || 'Fehler'
        errorEl.style.display = 'block'
        submitBtn.textContent = isLogin ? 'Einloggen' : 'Registrieren'
        submitBtn.disabled = false
      }
    })
  }

  private renderAccountView(): void {
    if (!this.mainContent) return

    const user = authStore.getUser()
    if (!user) {
      this.navigateToView('login')
      return
    }

    this.mainContent.innerHTML = `
      <div class="auth-view fade-in">
        <div class="account-card">
          <div class="account-avatar">
            ${icons.user}
          </div>
          <h2 class="account-email">${user.email}</h2>
          <p class="account-id">ID: ${user.id.slice(0, 8)}...</p>
          
          <div class="account-actions">
            <button class="btn btn--secondary btn--danger" id="btn-logout">
              Ausloggen
            </button>
          </div>
        </div>
      </div>
    `

    this.mainContent.querySelector('#btn-logout')?.addEventListener('click', () => {
      authStore.logout()
      if (toolRegistry.length > 0) {
        this.navigateToTool(toolRegistry[0].id)
      }
    })
  }

  private renderHomeView(): void {
    if (!this.mainContent) return

    const user = authStore.getUser()

    this.mainContent.innerHTML = `
      <div class="home-view fade-in">
        <!-- Hero Section -->
        <div class="home-hero">
          <div class="home-hero__icon">${icons.sparkles}</div>
          <h2 class="home-hero__title">Deine Toolbox</h2>
          <p class="home-hero__subtitle">Leistungsstarke Werkzeuge für deinen Alltag - schnell, einfach, lokal.</p>
        </div>

        ${!user ? `
          <div class="home-cta">
            <div class="home-cta__content">
              <h3>Noch mehr Möglichkeiten</h3>
              <p>Registriere dich kostenlos für unbegrenzte Links, Link-Verwaltung und mehr.</p>
            </div>
            <button class="btn btn--primary" id="home-login-btn">
              ${icons.user} Jetzt registrieren ${icons.arrowRight}
            </button>
          </div>
        ` : `
          <div class="home-welcome">
            <span class="home-welcome__icon">${icons.user}</span>
            <span>Willkommen zurück, <strong>${user.email.split('@')[0]}</strong>!</span>
          </div>
        `}

        <!-- Tools Grid -->
        <h3 class="home-section-title">Verfügbare Tools</h3>
        <div class="home-tools-grid">
          ${toolRegistry.map(tool => `
            <button class="home-tool-card" data-home-tool="${tool.id}">
              <div class="home-tool-card__icon">${tool.icon}</div>
              <div class="home-tool-card__content">
                <h4 class="home-tool-card__name">${tool.name}</h4>
                <p class="home-tool-card__desc">${tool.description}</p>
              </div>
              <span class="home-tool-card__arrow">${icons.arrowRight}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <style>
        .home-view {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .home-hero {
          text-align: center;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
        }
        .home-hero__icon {
          margin-bottom: 1rem;
        }
        .home-hero__icon svg {
          width: 48px;
          height: 48px;
          color: var(--accent-primary);
        }
        .home-hero__title {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .home-hero__subtitle {
          margin: 0;
          color: var(--text-secondary);
        }
        .home-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1));
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
        }
        .home-cta__content h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .home-cta__content p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .home-cta .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .home-cta .btn svg {
          width: 16px;
          height: 16px;
        }
        .home-welcome {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          color: var(--text-secondary);
        }
        .home-welcome__icon svg {
          width: 20px;
          height: 20px;
          color: #22c55e;
        }
        .home-section-title {
          margin: 0;
          font-size: 1rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .home-tools-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .home-tool-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .home-tool-card:hover {
          background: var(--bg-tertiary);
          border-color: var(--accent-primary);
          transform: translateX(4px);
        }
        .home-tool-card__icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 12px;
          flex-shrink: 0;
        }
        .home-tool-card__icon svg {
          width: 24px;
          height: 24px;
          color: white;
        }
        .home-tool-card__content {
          flex: 1;
        }
        .home-tool-card__name {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .home-tool-card__desc {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .home-tool-card__arrow {
          color: var(--text-muted);
          transition: transform 0.2s;
        }
        .home-tool-card__arrow svg {
          width: 20px;
          height: 20px;
        }
        .home-tool-card:hover .home-tool-card__arrow {
          color: var(--accent-primary);
          transform: translateX(4px);
        }
      </style>
    `

    // Event listeners
    this.mainContent.querySelectorAll('[data-home-tool]').forEach(card => {
      card.addEventListener('click', () => {
        const toolId = (card as HTMLElement).dataset.homeTool
        if (toolId) this.navigateToTool(toolId)
      })
    })

    this.mainContent.querySelector('#home-login-btn')?.addEventListener('click', () => {
      this.navigateToView('login')
    })
  }

  private renderSettingsView(): void {
    if (!this.mainContent) return

    const user = authStore.getUser()
    const settings = settingsStore.getSettings()

    this.mainContent.innerHTML = `
      <div class="settings-view fade-in">
        <!-- Appearance -->
        <div class="settings-section">
          <h3 class="settings-section__title">Erscheinungsbild</h3>
          <div class="settings-item">
            <div class="settings-item__info">
              <span class="settings-item__label">Theme</span>
              <span class="settings-item__desc">Wähle zwischen Hell, Dunkel oder System-Standard</span>
            </div>
            <div class="theme-toggle">
              <button class="theme-option ${settings.theme === 'dark' ? 'theme-option--active' : ''}" data-theme="dark">
                ${icons.moon} Dunkel
              </button>
              <button class="theme-option ${settings.theme === 'light' ? 'theme-option--active' : ''}" data-theme="light">
                ${icons.sun} Hell
              </button>
              <button class="theme-option ${settings.theme === 'system' ? 'theme-option--active' : ''}" data-theme="system">
                System
              </button>
            </div>
          </div>
        </div>

        <!-- Account -->
        <!-- Account -->
        <div class="settings-section">
          <h3 class="settings-section__title">Konto</h3>
          <div class="settings-item">
            <div class="settings-item__info">
              <span class="settings-item__label">${user ? 'Konto verwalten' : 'Nicht eingeloggt'}</span>
              <span class="settings-item__desc">${user ? 'Einstellungen & Sicherheit' : 'Melde dich an für mehr Funktionen'}</span>
            </div>
            <button class="btn btn--secondary" id="settings-to-account-btn">
              ${icons.user} ${user ? 'Zum Konto' : 'Zum Login'}
            </button>
          </div>
        </div>

        <!-- About -->
        <div class="settings-section">
          <h3 class="settings-section__title">Über</h3>
          <div class="settings-item">
            <div class="settings-item__info">
              <span class="settings-item__label">Toolbox</span>
              <span class="settings-item__desc">Version 2.0.0</span>
            </div>
          </div>
        </div>
      </div>

      <style>
        .settings-view {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          max-width: 600px;
        }
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .settings-section__title {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
        }
        .settings-item__info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .settings-item__label {
          font-weight: 500;
          color: var(--text-primary);
        }
        .settings-item__desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .theme-toggle {
          display: flex;
          gap: 0.25rem;
          padding: 0.25rem;
          background: var(--bg-tertiary);
          border-radius: 8px;
        }
        .theme-option {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .theme-option svg {
          width: 14px;
          height: 14px;
        }
        .theme-option:hover {
          color: var(--text-primary);
        }
        .theme-option--active {
          background: var(--accent-primary);
          color: white;
        }
        .settings-item .btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;
        }
        .settings-item .btn svg {
          width: 16px;
          height: 16px;
        }
      </style>
    `

    // Event listeners
    // Event listeners
    this.mainContent.querySelector('#settings-to-account-btn')?.addEventListener('click', () => {
      this.navigateToView('account')
    })

    // Theme toggle
    this.mainContent.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.theme as any
        settingsStore.set('theme', theme)
      })
    })
  }

  private navigateToTool(toolId: string): void {
    const tool = getToolById(toolId)
    if (!tool) return

    this.currentView = null
    this.currentToolId = toolId

    // Re-render to update sidebar active states
    this.render()

    // Update header
    const titleEl = document.getElementById('tool-title')
    const subtitleEl = document.getElementById('tool-subtitle')
    if (titleEl) titleEl.textContent = tool.name
    if (subtitleEl) subtitleEl.textContent = tool.description

    // Render tool component
    if (this.mainContent) {
      this.mainContent.innerHTML = ''
      const toolComponent = tool.component()
      this.mainContent.appendChild(toolComponent)
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  new ToolboxApp()
})
