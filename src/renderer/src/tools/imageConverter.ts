// Image Converter Tool Component
import { icons } from '../icons'

interface State {
    inputImage: {
        path: string
        name: string
        buffer: string
        size: number
        width: number
        height: number
        format: string
    } | null
    outputFormat: 'jpeg' | 'png' | 'webp' | 'avif'
    outputImage: {
        buffer: string
        size: number
        width: number
        height: number
    } | null
    isConverting: boolean
    error: string | null
    success: boolean
}

const FORMAT_OPTIONS = [
    { value: 'jpeg', label: 'JPEG', ext: 'jpg' },
    { value: 'png', label: 'PNG', ext: 'png' },
    { value: 'webp', label: 'WebP', ext: 'webp' },
    { value: 'avif', label: 'AVIF', ext: 'avif' }
] as const

export function createImageConverter(): HTMLElement {
    const state: State = {
        inputImage: null,
        outputFormat: 'webp',
        outputImage: null,
        isConverting: false,
        error: null,
        success: false
    }

    const container = document.createElement('div')
    container.className = 'compressor fade-in'

    function render(): void {
        container.innerHTML = `
      <!-- Dropzone -->
      <div class="dropzone" id="dropzone">
        <span class="dropzone__icon">${icons.upload}</span>
        <p class="dropzone__text">
          ${state.inputImage
                ? `<strong>${escapeHtml(state.inputImage.name)}</strong><br>${state.inputImage.format?.toUpperCase()} • ${formatSize(state.inputImage.size)} • ${state.inputImage.width}×${state.inputImage.height}`
                : 'Bild hierher ziehen oder <strong>klicken</strong> zum Auswählen'
            }
        </p>
      </div>

      ${state.inputImage ? `
        <!-- Format Selection -->
        <div class="settings">
          <div class="settings__row">
            <div class="settings__group">
              <label class="settings__label">
                Zielformat
              </label>
              <div class="format-buttons" style="display: flex; gap: 8px; margin-top: 8px;">
                ${FORMAT_OPTIONS.map(opt => `
                  <button 
                    class="btn ${state.outputFormat === opt.value ? 'btn--primary' : 'btn--secondary'}" 
                    data-format="${opt.value}"
                    ${state.inputImage?.format === opt.value ? 'disabled title="Bereits in diesem Format"' : ''}
                  >
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn btn--secondary" id="reset-btn">
            Zurücksetzen
          </button>
          <button class="btn btn--primary" id="convert-btn" ${state.isConverting || state.inputImage?.format === state.outputFormat ? 'disabled' : ''}>
            ${state.isConverting ? '<div class="spinner"></div>' : `${icons.zap} Konvertieren`}
          </button>
        </div>
      ` : ''}

      ${state.error ? `
        <div class="status status--error">${state.error}</div>
      ` : ''}

      ${state.success && state.outputImage ? `
        <div class="status status--success">
          ✓ Erfolgreich konvertiert! ${formatSize(state.inputImage?.size || 0)} → ${formatSize(state.outputImage.size)}
        </div>
      ` : ''}

      ${state.outputImage ? `
        <!-- Preview -->
        <div class="preview">
          <div class="preview__item">
            <span class="preview__label">Original (${state.inputImage?.format?.toUpperCase()})</span>
            <img src="data:image/${state.inputImage?.format};base64,${state.inputImage?.buffer}" class="preview__image" alt="Original">
            <div class="preview__stats">
              <span class="preview__size">${formatSize(state.inputImage?.size || 0)}</span>
              <span>${state.inputImage?.width}×${state.inputImage?.height}</span>
            </div>
          </div>
          <div class="preview__item">
            <span class="preview__label">Konvertiert (${state.outputFormat.toUpperCase()})</span>
            <img src="data:image/${state.outputFormat};base64,${state.outputImage.buffer}" class="preview__image" alt="Converted">
            <div class="preview__stats">
              <span class="preview__size">${formatSize(state.outputImage.size)}</span>
              <span>${state.outputImage.width}×${state.outputImage.height}</span>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="actions">
          <button class="btn btn--primary" id="save-btn">
            ${icons.download} Speichern
          </button>
        </div>
      ` : ''}
    `

        attachEventListeners()
    }

    function attachEventListeners(): void {
        const dropzone = container.querySelector('#dropzone') as HTMLElement
        const convertBtn = container.querySelector('#convert-btn') as HTMLButtonElement
        const resetBtn = container.querySelector('#reset-btn') as HTMLButtonElement
        const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement

        // Dropzone click
        dropzone?.addEventListener('click', handleSelectFile)

        // Dropzone drag & drop
        dropzone?.addEventListener('dragover', (e) => {
            e.preventDefault()
            dropzone.classList.add('dropzone--active')
        })

        dropzone?.addEventListener('dragleave', () => {
            dropzone.classList.remove('dropzone--active')
        })

        dropzone?.addEventListener('drop', async (e) => {
            e.preventDefault()
            dropzone.classList.remove('dropzone--active')
            // Note: Drag & drop requires additional IPC handling
            // For now, just use file dialog
            handleSelectFile()
        })

        // Format buttons
        container.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = (btn as HTMLElement).dataset.format as State['outputFormat']
                state.outputFormat = format
                state.outputImage = null
                state.success = false
                render()
            })
        })

        // Convert button
        convertBtn?.addEventListener('click', handleConvert)

        // Reset button
        resetBtn?.addEventListener('click', () => {
            state.inputImage = null
            state.outputImage = null
            state.error = null
            state.success = false
            render()
        })

        // Save button
        saveBtn?.addEventListener('click', handleSave)
    }

    async function handleSelectFile(): Promise<void> {
        try {
            const result = await window.api.openFile({
                filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }]
            })

            if (result) {
                state.inputImage = result
                state.outputImage = null
                state.error = null
                state.success = false

                // Auto-select a different format
                const currentFormat = result.format?.toLowerCase()
                if (currentFormat === state.outputFormat) {
                    const differentFormat = FORMAT_OPTIONS.find(f => f.value !== currentFormat)
                    if (differentFormat) {
                        state.outputFormat = differentFormat.value
                    }
                }

                render()
            }
        } catch (error) {
            state.error = 'Fehler beim Öffnen der Datei'
            render()
        }
    }

    async function handleConvert(): Promise<void> {
        if (!state.inputImage || state.isConverting) return

        state.isConverting = true
        state.error = null
        render()

        try {
            const result = await window.api.compressImage({
                inputBuffer: state.inputImage.buffer,
                quality: 95, // High quality for format conversion
                format: state.outputFormat
            })

            state.outputImage = result
            state.success = true

        } catch (error) {
            state.error = 'Fehler bei der Konvertierung'
            console.error('Convert error:', error)
        } finally {
            state.isConverting = false
            render()
        }
    }

    async function handleSave(): Promise<void> {
        if (!state.outputImage || !state.inputImage) return

        try {
            const ext = FORMAT_OPTIONS.find(f => f.value === state.outputFormat)?.ext || state.outputFormat
            const baseName = state.inputImage.name.replace(/\.[^.]+$/, '')
            const defaultPath = `${baseName}.${ext}`

            const filePath = await window.api.saveFile({
                defaultPath,
                filters: [{ name: 'Image', extensions: [ext] }]
            })

            if (filePath) {
                await window.api.writeFile({
                    filePath,
                    data: state.outputImage.buffer
                })
            }
        } catch (error) {
            state.error = 'Fehler beim Speichern'
            render()
        }
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    function escapeHtml(text: string): string {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    render()
    return container
}
