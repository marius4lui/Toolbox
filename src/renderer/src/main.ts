// Main Application Entry Point
import './styles/global.css'
import { icons } from './icons'
import { toolRegistry, getToolById } from './toolRegistry'
import type { Tool } from './types'

class ToolboxApp {
    private container: HTMLElement
    private currentToolId: string | null = null
    private mainContent: HTMLElement | null = null

    constructor() {
        this.container = document.getElementById('app')!
        this.render()

        // Default to first tool
        if (toolRegistry.length > 0) {
            this.navigateToTool(toolRegistry[0].id)
        }
    }

    private render(): void {
        this.container.innerHTML = `
      <!-- Titlebar -->
      <div class="titlebar">
        <div class="titlebar__controls">
          <button class="titlebar__btn titlebar__btn--close" id="btn-close"></button>
          <button class="titlebar__btn titlebar__btn--minimize" id="btn-minimize"></button>
          <button class="titlebar__btn titlebar__btn--maximize" id="btn-maximize"></button>
        </div>
        <div class="titlebar__title">Toolbox</div>
        <div style="width: 60px;"></div>
      </div>

      <!-- Main Layout -->
      <div class="layout">
        <!-- Sidebar -->
        <aside class="sidebar">
          <nav class="sidebar__nav" id="sidebar-nav">
            ${toolRegistry.map(tool => `
              <button class="sidebar__item" data-tool-id="${tool.id}" title="${tool.name}">
                <span class="sidebar__icon">${tool.icon}</span>
              </button>
            `).join('')}
          </nav>
          <div class="sidebar__spacer"></div>
          <nav class="sidebar__nav">
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

    private navigateToTool(toolId: string): void {
        const tool = getToolById(toolId)
        if (!tool) return

        // Update active state in sidebar
        document.querySelectorAll('[data-tool-id]').forEach(btn => {
            btn.classList.toggle('sidebar__item--active', btn.getAttribute('data-tool-id') === toolId)
        })

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

        this.currentToolId = toolId
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new ToolboxApp()
})
