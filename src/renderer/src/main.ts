// Main Application Entry Point
import './styles/global.css'
import { icons } from './icons'
import { toolRegistry, getToolById } from './toolRegistry'
import { authStore, Session } from './authStore'

// Special views (not in tool registry)
type SpecialView = 'login' | 'account' | null

class ToolboxApp {
  private container: HTMLElement
  private currentToolId: string | null = null
  private currentView: SpecialView = null
  private mainContent: HTMLElement | null = null

  constructor() {
    this.container = document.getElementById('app')!
    this.render()

    // Subscribe to auth changes
    authStore.subscribe(() => this.updateAuthUI())

    // Default to first tool
    if (toolRegistry.length > 0) {
      this.navigateToTool(toolRegistry[0].id)
    }
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
          <div class="sidebar__logo">
            <img src="./assets/logo.png" alt="Toolbox" class="sidebar__logo-img">
          </div>
          <nav class="sidebar__nav" id="sidebar-nav">
            ${toolRegistry.map(tool => `
              <button class="sidebar__item" data-tool-id="${tool.id}" title="${tool.name}">
                <span class="sidebar__icon">${tool.icon}</span>
              </button>
            `).join('')}
          </nav>
          <div class="sidebar__spacer"></div>
          <nav class="sidebar__nav">
            ${user ? `
              <button class="sidebar__item" id="btn-sidebar-account" title="Mein Konto">
                <span class="sidebar__icon">${icons.user}</span>
              </button>
            ` : `
              <button class="sidebar__item" id="btn-sidebar-login" title="Login">
                <span class="sidebar__icon">${icons.user}</span>
              </button>
            `}
            <button class="sidebar__item" id="btn-settings" title="Einstellungen">
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

    // Clear active states
    document.querySelectorAll('[data-tool-id]').forEach(btn => {
      btn.classList.remove('sidebar__item--active')
    })

    // Highlight sidebar button
    if (view === 'login') {
      document.getElementById('btn-sidebar-login')?.classList.add('sidebar__item--active')
    } else if (view === 'account') {
      document.getElementById('btn-sidebar-account')?.classList.add('sidebar__item--active')
    }

    // Update header
    const titleEl = document.getElementById('tool-title')
    const subtitleEl = document.getElementById('tool-subtitle')

    if (view === 'login') {
      if (titleEl) titleEl.textContent = 'Login'
      if (subtitleEl) subtitleEl.textContent = 'Melde dich an oder registriere dich'
      this.renderLoginView()
    } else if (view === 'account') {
      if (titleEl) titleEl.textContent = 'Mein Konto'
      if (subtitleEl) subtitleEl.textContent = 'Kontoeinstellungen und Profil'
      this.renderAccountView()
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

  private navigateToTool(toolId: string): void {
    const tool = getToolById(toolId)
    if (!tool) return

    this.currentView = null
    this.currentToolId = toolId

    // Update active state in sidebar
    document.querySelectorAll('[data-tool-id]').forEach(btn => {
      btn.classList.toggle('sidebar__item--active', btn.getAttribute('data-tool-id') === toolId)
    })

    // Clear special view highlighting
    document.getElementById('btn-sidebar-login')?.classList.remove('sidebar__item--active')
    document.getElementById('btn-sidebar-account')?.classList.remove('sidebar__item--active')

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
