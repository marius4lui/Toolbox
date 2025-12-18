// QR Code Generator Tool Component
import { icons } from '../icons'

interface State {
    targetUrl: string
    shortUrl: string | null
    hash: string | null
    qrDataUrl: string | null
    isGenerating: boolean
    error: string | null
    copied: boolean
}

// API Base URL for the redirect service
const API_BASE = 'https://toolbox.qhrd.online'

export function createQrGenerator(): HTMLElement {
    // State
    const state: State = {
        targetUrl: '',
        shortUrl: null,
        hash: null,
        qrDataUrl: null,
        isGenerating: false,
        error: null,
        copied: false
    }

    // Create container
    const container = document.createElement('div')
    container.className = 'qr-generator fade-in'

    // Render function
    function render(): void {
        container.innerHTML = `
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
                : `${icons.zap} Generieren`
            }
          </button>
        </div>
      </div>

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

        attachEventListeners()
    }

    // Event listeners
    function attachEventListeners(): void {
        const urlInput = container.querySelector('#url-input') as HTMLInputElement
        const generateBtn = container.querySelector('#generate-btn') as HTMLButtonElement
        const copyUrlBtn = container.querySelector('#copy-url-btn') as HTMLButtonElement
        const downloadPngBtn = container.querySelector('#download-png-btn') as HTMLButtonElement
        const copyQrBtn = container.querySelector('#copy-qr-btn') as HTMLButtonElement
        const resetBtn = container.querySelector('#reset-btn') as HTMLButtonElement

        // URL input
        urlInput?.addEventListener('input', () => {
            state.targetUrl = urlInput.value
        })

        urlInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleGenerate()
            }
        })

        // Generate button
        generateBtn?.addEventListener('click', handleGenerate)

        // Copy URL button
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

        // Download PNG button
        downloadPngBtn?.addEventListener('click', handleDownloadPng)

        // Copy QR button
        copyQrBtn?.addEventListener('click', handleCopyQr)

        // Reset button
        resetBtn?.addEventListener('click', () => {
            state.targetUrl = ''
            state.shortUrl = null
            state.hash = null
            state.qrDataUrl = null
            state.error = null
            render()
        })
    }

    // Generate QR code
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
            // Create redirect via API
            const response = await fetch(`${API_BASE}/api/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: state.targetUrl })
            })

            if (!response.ok) {
                throw new Error('Server error')
            }

            const data = await response.json()
            state.hash = data.hash
            state.shortUrl = data.shortUrl

            // Generate QR code
            const qrDataUrl = await generateQrCode(data.shortUrl)
            state.qrDataUrl = qrDataUrl

        } catch (error) {
            console.error('Error:', error)
            state.error = 'Fehler beim Generieren. Bitte versuche es erneut.'
        } finally {
            state.isGenerating = false
            render()
        }
    }

    // Generate QR code using canvas
    async function generateQrCode(text: string): Promise<string> {
        // Use QRCode library from CDN (loaded in HTML)
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
            // Fallback for browsers that don't support clipboard image
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
