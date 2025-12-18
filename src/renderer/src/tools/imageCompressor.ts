// Image Compressor Tool Component
import { ImageFile, CompressedImage, CompressOptions } from '../types'
import { icons } from '../icons'
import { settingsStore } from '../settingsStore'

interface State {
  originalImage: ImageFile | null
  compressedImage: CompressedImage | null
  quality: number
  format: CompressOptions['format']
  isCompressing: boolean
  error: string | null
}

export function createImageCompressor(): HTMLElement {
  // Get defaults from store
  const settings = settingsStore.getSettings()
  const defaults = settings.imageCompressor || { defaultQuality: 80, defaultFormat: 'webp' }

  // State
  const state: State = {
    originalImage: null,
    compressedImage: null,
    quality: defaults.defaultQuality,
    format: defaults.defaultFormat as CompressOptions['format'],
    isCompressing: false,
    error: null
  }

  // Create container
  const container = document.createElement('div')
  container.className = 'compressor fade-in'

  // Render function
  function render(): void {
    container.innerHTML = `
      <!-- Drop Zone -->
      <div class="dropzone" id="dropzone">
        <div class="dropzone__icon">${icons.upload}</div>
        <div class="dropzone__text">
          ${state.originalImage
        ? `<strong>${state.originalImage.name}</strong><br><span style="color: var(--text-secondary)">${formatBytes(state.originalImage.size)} • ${state.originalImage.width}×${state.originalImage.height}</span>`
        : 'Bild hier ablegen oder <strong>klicken</strong> zum Auswählen'
      }
        </div>
      </div>

      ${state.originalImage ? `
        <!-- Settings -->
        <div class="settings">
          <div class="settings__row">
            <div class="settings__group">
              <label class="settings__label">
                Qualität
                <span class="settings__value">${state.quality}%</span>
              </label>
              <input type="range" class="slider" id="quality-slider" 
                min="1" max="100" value="${state.quality}">
            </div>
            <div class="settings__group" style="flex: 0 0 auto;">
              <label class="settings__label">Format</label>
              <select class="select" id="format-select">
                <option value="webp" ${state.format === 'webp' ? 'selected' : ''}>WebP</option>
                <option value="jpeg" ${state.format === 'jpeg' ? 'selected' : ''}>JPEG</option>
                <option value="png" ${state.format === 'png' ? 'selected' : ''}>PNG</option>
                <option value="avif" ${state.format === 'avif' ? 'selected' : ''}>AVIF</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Original Image Preview (always shown when image is loaded) -->
        <div class="preview preview--single">
          <div class="preview__item">
            <span class="preview__label">Original</span>
            <img class="preview__image" src="data:${getMimeType(state.originalImage.format)};base64,${state.originalImage.buffer}" alt="Original" onerror="this.style.display='none'; console.error('Image load error, format:', '${state.originalImage.format}')">
            <div class="preview__stats">
              <span class="preview__size">${formatBytes(state.originalImage.size)}</span>
              <span>${state.originalImage.width}×${state.originalImage.height} • ${state.originalImage.format?.toUpperCase() || 'Unbekannt'}</span>
            </div>
          </div>
          ${state.compressedImage ? `
            <div class="preview__item">
              <span class="preview__label">Komprimiert</span>
              <img class="preview__image" src="data:${getMimeType(state.compressedImage.format)};base64,${state.compressedImage.buffer}" alt="Compressed">
              <div class="preview__stats">
                <span class="preview__size">${formatBytes(state.compressedImage.size)}</span>
                <span class="preview__savings">-${calculateSavings(state.originalImage.size, state.compressedImage.size)}%</span>
              </div>
            </div>
          ` : ''}
        </div>

        ${state.error ? `
          <div class="status status--error">${state.error}</div>
        ` : ''}

        <!-- Actions -->
        <div class="actions">
          <button class="btn btn--secondary" id="reset-btn">
            Zurücksetzen
          </button>
          <button class="btn btn--primary" id="compress-btn" ${state.isCompressing ? 'disabled' : ''}>
            ${state.isCompressing
          ? '<div class="spinner"></div> Komprimiere...'
          : `${icons.zap} Komprimieren`
        }
          </button>
          ${state.compressedImage ? `
            <button class="btn btn--primary" id="save-btn">
              ${icons.download} Speichern
            </button>
          ` : ''}
        </div>
      ` : ''}
    `

    attachEventListeners()
  }

  // Event listeners
  function attachEventListeners(): void {
    const dropzone = container.querySelector('#dropzone') as HTMLElement
    const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement
    const formatSelect = container.querySelector('#format-select') as HTMLSelectElement
    const compressBtn = container.querySelector('#compress-btn') as HTMLButtonElement
    const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement
    const resetBtn = container.querySelector('#reset-btn') as HTMLButtonElement

    // Dropzone click
    dropzone?.addEventListener('click', handleFileSelect)

    // Drag and drop
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

      const file = e.dataTransfer?.files[0]
      if (file && file.type.startsWith('image/')) {
        await loadFileFromDrop(file)
      }
    })

    // Quality slider
    qualitySlider?.addEventListener('input', () => {
      state.quality = parseInt(qualitySlider.value)
      state.compressedImage = null
      render()
    })

    // Format select
    formatSelect?.addEventListener('change', () => {
      state.format = formatSelect.value as CompressOptions['format']
      state.compressedImage = null
      render()
    })

    // Compress button
    compressBtn?.addEventListener('click', handleCompress)

    // Save button
    saveBtn?.addEventListener('click', handleSave)

    // Reset button
    resetBtn?.addEventListener('click', () => {
      state.originalImage = null
      state.compressedImage = null
      state.error = null
      render()
    })
  }

  // Handle file selection via dialog
  async function handleFileSelect(): Promise<void> {
    try {
      const result = await window.api.openFile({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }]
      })

      if (result) {
        state.originalImage = result
        state.compressedImage = null
        state.error = null
        render()
      }
    } catch (error) {
      state.error = 'Fehler beim Laden der Datei'
      render()
    }
  }

  // Handle file from drag and drop
  async function loadFileFromDrop(file: File): Promise<void> {
    try {
      const buffer = await file.arrayBuffer()
      const base64 = arrayBufferToBase64(buffer)

      // Create a temporary image to get dimensions
      const img = new Image()
      img.src = `data:${file.type};base64,${base64}`

      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
      })

      state.originalImage = {
        path: file.name,
        name: file.name,
        buffer: base64,
        size: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type.split('/')[1]
      }
      state.compressedImage = null
      state.error = null
      render()
    } catch (error) {
      state.error = 'Fehler beim Laden der Datei'
      render()
    }
  }

  // Handle compression
  async function handleCompress(): Promise<void> {
    if (!state.originalImage || state.isCompressing) return

    state.isCompressing = true
    state.error = null
    render()

    try {
      const result = await window.api.compressImage({
        inputBuffer: state.originalImage.buffer,
        quality: state.quality,
        format: state.format
      })

      state.compressedImage = result
    } catch (error) {
      state.error = 'Fehler bei der Komprimierung'
    } finally {
      state.isCompressing = false
      render()
    }
  }

  // Handle save
  async function handleSave(): Promise<void> {
    if (!state.compressedImage || !state.originalImage) return

    try {
      const originalName = state.originalImage.name.replace(/\.[^/.]+$/, '')
      const filePath = await window.api.saveFile({
        defaultPath: `${originalName}_compressed.${state.format}`,
        filters: [{ name: 'Image', extensions: [state.format] }]
      })

      if (filePath) {
        await window.api.saveToFile({
          filePath,
          data: state.compressedImage.buffer
        })
      }
    } catch (error) {
      state.error = 'Fehler beim Speichern'
      render()
    }
  }

  // Initial render
  render()

  return container
}

// Utility functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function calculateSavings(original: number, compressed: number): string {
  const savings = ((original - compressed) / original) * 100
  return Math.round(savings).toString()
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function getMimeType(format: string | undefined): string {
  if (!format) {
    console.warn('getMimeType: format is undefined, defaulting to png')
    return 'image/png'
  }

  const normalizedFormat = format.toLowerCase().trim()

  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'avif': 'image/avif',
    'svg': 'image/svg+xml',
    'svg+xml': 'image/svg+xml',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'heic': 'image/heic',
    'heif': 'image/heif'
  }

  const result = mimeTypes[normalizedFormat] || `image/${normalizedFormat}`
  console.log(`getMimeType: ${format} -> ${result}`)
  return result
}

// Get suggested output format based on input format
function getSuggestedFormat(inputFormat: string | undefined): 'jpeg' | 'png' | 'webp' | 'avif' {
  if (!inputFormat) return 'webp'

  const format = inputFormat.toLowerCase()

  // Keep PNG for images that might have transparency
  if (format === 'png' || format === 'gif') {
    return 'png'
  }

  // Default to WebP for best compression
  return 'webp'
}
