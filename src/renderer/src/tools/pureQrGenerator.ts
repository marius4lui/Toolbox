// Pure QR Code Generator Tool Component
// Generates QR codes for various data types without URL shortening
import { icons } from '../icons'
import { settingsStore } from '../settingsStore'

type QRType = 'url' | 'wifi' | 'vcard' | 'email' | 'phone' | 'sms' | 'geo'

interface State {
  activeType: QRType

  // Common
  qrDataUrl: string | null
  qrSvg: string | null
  error: string | null

  // Settings
  size: number
  fgColor: string
  bgColor: string
  errorCorrection: 'L' | 'M' | 'Q' | 'H'

  // URL/Text
  urlText: string

  // WiFi
  wifiSsid: string
  wifiPassword: string
  wifiEncryption: 'WPA' | 'WEP' | 'nopass'
  wifiHidden: boolean

  // vCard
  vcardName: string
  vcardPhone: string
  vcardEmail: string
  vcardOrg: string
  vcardUrl: string

  // Email
  emailTo: string
  emailSubject: string
  emailBody: string

  // Phone
  phoneNumber: string

  // SMS
  smsNumber: string
  smsBody: string

  // Geo
  geoLat: string
  geoLng: string
  geoLabel: string
}

const QR_TYPES: { id: QRType; label: string; icon: string }[] = [
  { id: 'url', label: 'URL/Text', icon: icons.link },
  { id: 'wifi', label: 'WiFi', icon: icons.wifi || icons.settings },
  { id: 'vcard', label: 'Kontakt', icon: icons.user },
  { id: 'email', label: 'E-Mail', icon: icons.mail || icons.send },
  { id: 'phone', label: 'Telefon', icon: icons.phone || icons.zap },
  { id: 'sms', label: 'SMS', icon: icons.messageSquare || icons.send },
  { id: 'geo', label: 'Standort', icon: icons.mapPin || icons.compass }
]

export function createPureQrGenerator(): HTMLElement {
  const settings = settingsStore.getSettings()
  const defaultSize = settings.qrGenerator?.defaultSize || 300

  const state: State = {
    activeType: 'url',
    qrDataUrl: null,
    qrSvg: null,
    error: null,
    size: defaultSize,
    fgColor: '#ffffff',
    bgColor: '#000000',
    errorCorrection: 'M',
    urlText: '',
    wifiSsid: '',
    wifiPassword: '',
    wifiEncryption: 'WPA',
    wifiHidden: false,
    vcardName: '',
    vcardPhone: '',
    vcardEmail: '',
    vcardOrg: '',
    vcardUrl: '',
    emailTo: '',
    emailSubject: '',
    emailBody: '',
    phoneNumber: '',
    smsNumber: '',
    smsBody: '',
    geoLat: '',
    geoLng: '',
    geoLabel: ''
  }

  const container = document.createElement('div')
  container.className = 'qr-generator fade-in'

  function render(): void {
    container.innerHTML = `
      <div class="qr-type-selector">
        ${QR_TYPES.map(type => `
          <button class="qr-type-btn ${state.activeType === type.id ? 'qr-type-btn--active' : ''}" data-type="${type.id}">
            ${type.icon}
            <span>${type.label}</span>
          </button>
        `).join('')}
      </div>

      <div class="qr-content-grid">
        <div class="qr-input-panel">
          ${renderInputForm()}

          <div class="qr-settings">
            <h4 class="qr-settings__title">Einstellungen</h4>
            <div class="qr-settings__grid">
              <div class="qr-setting">
                <label>Größe: ${state.size}px</label>
                <input type="range" min="100" max="600" step="50" value="${state.size}" id="size-slider">
              </div>
              <div class="qr-setting">
                <label>Vordergrund</label>
                <input type="color" value="${state.fgColor}" id="fg-color">
              </div>
              <div class="qr-setting">
                <label>Hintergrund</label>
                <input type="color" value="${state.bgColor}" id="bg-color">
              </div>
              <div class="qr-setting">
                <label>Fehlerkorrektur</label>
                <select id="error-correction">
                  <option value="L" ${state.errorCorrection === 'L' ? 'selected' : ''}>L (7%)</option>
                  <option value="M" ${state.errorCorrection === 'M' ? 'selected' : ''}>M (15%)</option>
                  <option value="Q" ${state.errorCorrection === 'Q' ? 'selected' : ''}>Q (25%)</option>
                  <option value="H" ${state.errorCorrection === 'H' ? 'selected' : ''}>H (30%)</option>
                </select>
              </div>
            </div>
          </div>

          <button class="btn btn--primary btn--full" id="generate-btn">
            <span class="btn__icon">${icons.zap}</span>
            <span>QR-Code generieren</span>
          </button>
        </div>

        <div class="qr-preview-panel">
          ${state.error ? `<div class="status status--error">${state.error}</div>` : ''}
          
          ${state.qrDataUrl ? `
            <div class="qr-preview">
              <img src="${state.qrDataUrl}" alt="QR Code" class="qr-image" style="width: ${state.size}px; height: ${state.size}px;">
            </div>
            <div class="qr-actions">
              <button class="btn btn--secondary" id="download-png-btn">
                <span class="btn__icon">${icons.download}</span> PNG
              </button>
              <button class="btn btn--secondary" id="download-svg-btn">
                <span class="btn__icon">${icons.download}</span> SVG
              </button>
              <button class="btn btn--secondary" id="copy-btn">
                <span class="btn__icon">${icons.copy}</span> Kopieren
              </button>
            </div>
          ` : `
            <div class="qr-placeholder">
              <div class="qr-placeholder__icon">${icons.qrcode || icons.image}</div>
              <p>Fülle die Felder aus und klicke auf "QR-Code generieren"</p>
            </div>
          `}
        </div>
      </div>

      <style>
        .qr-type-selector {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .qr-type-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .qr-type-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .qr-type-btn--active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        .qr-type-btn svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .qr-content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        @media (max-width: 900px) {
          .qr-content-grid {
            grid-template-columns: 1fr;
          }
        }
        .qr-input-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .qr-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .qr-form-group label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .qr-form-group input,
        .qr-form-group textarea,
        .qr-form-group select {
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .qr-form-group input:focus,
        .qr-form-group textarea:focus,
        .qr-form-group select:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
        .qr-form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        .qr-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .qr-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .qr-checkbox input {
          width: 18px;
          height: 18px;
          accent-color: var(--accent-primary);
        }
        .qr-settings {
          padding: 1rem;
          background: var(--bg-tertiary);
          border-radius: 8px;
          border: 1px solid var(--border-primary);
        }
        .qr-settings__title {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .qr-settings__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .qr-setting {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .qr-setting label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .qr-setting input[type="range"] {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: var(--bg-secondary);
          border-radius: 3px;
          cursor: pointer;
        }
        .qr-setting input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: var(--accent-primary);
          border-radius: 50%;
          cursor: pointer;
        }
        .qr-setting input[type="color"] {
          width: 100%;
          height: 40px;
          padding: 2px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          cursor: pointer;
          background: var(--bg-secondary);
        }
        .qr-setting input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 2px;
        }
        .qr-setting input[type="color"]::-webkit-color-swatch {
          border-radius: 4px;
          border: none;
        }
        .qr-setting select {
          padding: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          color: var(--text-primary);
        }
        .qr-preview-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 2rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          min-height: 400px;
        }
        .qr-preview {
          padding: 1rem;
          background: white;
          border-radius: 8px;
        }
        .qr-placeholder {
          text-align: center;
          color: var(--text-muted);
        }
        .qr-placeholder__icon {
          margin-bottom: 1rem;
          opacity: 0.3;
        }
        .qr-placeholder__icon svg {
          width: 80px;
          height: 80px;
        }
        .qr-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn--full {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn--full svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        #generate-btn {
          margin-top: 0.5rem;
          padding: 1rem 1.5rem;
          font-size: 1rem;
        }
        #generate-btn .btn__icon svg {
          width: 20px;
          height: 20px;
        }
        .btn__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn__icon svg {
          width: 16px;
          height: 16px;
        }
        .btn--secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }
        .btn--secondary .btn__icon svg {
          width: 14px;
          height: 14px;
        }
      </style>
    `

    attachEventListeners()
  }

  function renderInputForm(): string {
    switch (state.activeType) {
      case 'url':
        return `
          <div class="qr-form-group">
            <label>URL oder Text</label>
            <input type="text" id="url-text" value="${escapeHtml(state.urlText)}" placeholder="https://example.com oder beliebiger Text">
          </div>
        `

      case 'wifi':
        return `
          <div class="qr-form-group">
            <label>Netzwerkname (SSID)</label>
            <input type="text" id="wifi-ssid" value="${escapeHtml(state.wifiSsid)}" placeholder="Mein WLAN">
          </div>
          <div class="qr-form-group">
            <label>Passwort</label>
            <input type="password" id="wifi-password" value="${escapeHtml(state.wifiPassword)}" placeholder="Passwort">
          </div>
          <div class="qr-form-row">
            <div class="qr-form-group">
              <label>Verschlüsselung</label>
              <select id="wifi-encryption">
                <option value="WPA" ${state.wifiEncryption === 'WPA' ? 'selected' : ''}>WPA/WPA2</option>
                <option value="WEP" ${state.wifiEncryption === 'WEP' ? 'selected' : ''}>WEP</option>
                <option value="nopass" ${state.wifiEncryption === 'nopass' ? 'selected' : ''}>Offen</option>
              </select>
            </div>
            <div class="qr-form-group">
              <label>&nbsp;</label>
              <div class="qr-checkbox">
                <input type="checkbox" id="wifi-hidden" ${state.wifiHidden ? 'checked' : ''}>
                <label for="wifi-hidden">Verstecktes Netzwerk</label>
              </div>
            </div>
          </div>
        `

      case 'vcard':
        return `
          <div class="qr-form-group">
            <label>Name</label>
            <input type="text" id="vcard-name" value="${escapeHtml(state.vcardName)}" placeholder="Max Mustermann">
          </div>
          <div class="qr-form-row">
            <div class="qr-form-group">
              <label>Telefon</label>
              <input type="tel" id="vcard-phone" value="${escapeHtml(state.vcardPhone)}" placeholder="+49 123 456789">
            </div>
            <div class="qr-form-group">
              <label>E-Mail</label>
              <input type="email" id="vcard-email" value="${escapeHtml(state.vcardEmail)}" placeholder="max@example.com">
            </div>
          </div>
          <div class="qr-form-group">
            <label>Firma / Organisation</label>
            <input type="text" id="vcard-org" value="${escapeHtml(state.vcardOrg)}" placeholder="Firma GmbH">
          </div>
          <div class="qr-form-group">
            <label>Website</label>
            <input type="url" id="vcard-url" value="${escapeHtml(state.vcardUrl)}" placeholder="https://example.com">
          </div>
        `

      case 'email':
        return `
          <div class="qr-form-group">
            <label>E-Mail Adresse</label>
            <input type="email" id="email-to" value="${escapeHtml(state.emailTo)}" placeholder="empfaenger@example.com">
          </div>
          <div class="qr-form-group">
            <label>Betreff</label>
            <input type="text" id="email-subject" value="${escapeHtml(state.emailSubject)}" placeholder="Betreff der E-Mail">
          </div>
          <div class="qr-form-group">
            <label>Nachricht</label>
            <textarea id="email-body" placeholder="Nachrichtentext...">${escapeHtml(state.emailBody)}</textarea>
          </div>
        `

      case 'phone':
        return `
          <div class="qr-form-group">
            <label>Telefonnummer</label>
            <input type="tel" id="phone-number" value="${escapeHtml(state.phoneNumber)}" placeholder="+49 123 456789">
          </div>
        `

      case 'sms':
        return `
          <div class="qr-form-group">
            <label>Telefonnummer</label>
            <input type="tel" id="sms-number" value="${escapeHtml(state.smsNumber)}" placeholder="+49 123 456789">
          </div>
          <div class="qr-form-group">
            <label>Nachricht</label>
            <textarea id="sms-body" placeholder="SMS Text...">${escapeHtml(state.smsBody)}</textarea>
          </div>
        `

      case 'geo':
        return `
          <div class="qr-form-row">
            <div class="qr-form-group">
              <label>Breitengrad (Latitude)</label>
              <input type="text" id="geo-lat" value="${escapeHtml(state.geoLat)}" placeholder="52.520008">
            </div>
            <div class="qr-form-group">
              <label>Längengrad (Longitude)</label>
              <input type="text" id="geo-lng" value="${escapeHtml(state.geoLng)}" placeholder="13.404954">
            </div>
          </div>
          <div class="qr-form-group">
            <label>Bezeichnung (optional)</label>
            <input type="text" id="geo-label" value="${escapeHtml(state.geoLabel)}" placeholder="Brandenburger Tor">
          </div>
        `

      default:
        return ''
    }
  }

  function attachEventListeners(): void {
    // Type selector
    container.querySelectorAll('.qr-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeType = (btn as HTMLElement).dataset.type as QRType
        state.qrDataUrl = null
        state.qrSvg = null
        state.error = null
        render()
      })
    })

    // Settings
    const sizeSlider = container.querySelector('#size-slider') as HTMLInputElement
    sizeSlider?.addEventListener('input', () => {
      state.size = parseInt(sizeSlider.value)
      render()
    })

    const fgColor = container.querySelector('#fg-color') as HTMLInputElement
    fgColor?.addEventListener('input', () => {
      state.fgColor = fgColor.value
    })

    const bgColor = container.querySelector('#bg-color') as HTMLInputElement
    bgColor?.addEventListener('input', () => {
      state.bgColor = bgColor.value
    })

    const errorCorrection = container.querySelector('#error-correction') as HTMLSelectElement
    errorCorrection?.addEventListener('change', () => {
      state.errorCorrection = errorCorrection.value as 'L' | 'M' | 'Q' | 'H'
    })

    // Form inputs
    bindInput('#url-text', 'urlText')
    bindInput('#wifi-ssid', 'wifiSsid')
    bindInput('#wifi-password', 'wifiPassword')
    bindSelect('#wifi-encryption', 'wifiEncryption')
    bindCheckbox('#wifi-hidden', 'wifiHidden')
    bindInput('#vcard-name', 'vcardName')
    bindInput('#vcard-phone', 'vcardPhone')
    bindInput('#vcard-email', 'vcardEmail')
    bindInput('#vcard-org', 'vcardOrg')
    bindInput('#vcard-url', 'vcardUrl')
    bindInput('#email-to', 'emailTo')
    bindInput('#email-subject', 'emailSubject')
    bindInput('#email-body', 'emailBody')
    bindInput('#phone-number', 'phoneNumber')
    bindInput('#sms-number', 'smsNumber')
    bindInput('#sms-body', 'smsBody')
    bindInput('#geo-lat', 'geoLat')
    bindInput('#geo-lng', 'geoLng')
    bindInput('#geo-label', 'geoLabel')

    // Generate button
    const generateBtn = container.querySelector('#generate-btn') as HTMLButtonElement
    generateBtn?.addEventListener('click', handleGenerate)

    // Download buttons
    const downloadPngBtn = container.querySelector('#download-png-btn') as HTMLButtonElement
    downloadPngBtn?.addEventListener('click', handleDownloadPng)

    const downloadSvgBtn = container.querySelector('#download-svg-btn') as HTMLButtonElement
    downloadSvgBtn?.addEventListener('click', handleDownloadSvg)

    const copyBtn = container.querySelector('#copy-btn') as HTMLButtonElement
    copyBtn?.addEventListener('click', handleCopy)
  }

  function bindInput(selector: string, stateKey: keyof State): void {
    const el = container.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
    el?.addEventListener('input', () => {
      (state as Record<string, unknown>)[stateKey] = el.value
    })
  }

  function bindSelect(selector: string, stateKey: keyof State): void {
    const el = container.querySelector(selector) as HTMLSelectElement
    el?.addEventListener('change', () => {
      (state as Record<string, unknown>)[stateKey] = el.value
    })
  }

  function bindCheckbox(selector: string, stateKey: keyof State): void {
    const el = container.querySelector(selector) as HTMLInputElement
    el?.addEventListener('change', () => {
      (state as Record<string, unknown>)[stateKey] = el.checked
    })
  }

  function getQRData(): string | null {
    switch (state.activeType) {
      case 'url':
        return state.urlText || null

      case 'wifi':
        if (!state.wifiSsid) return null
        const hidden = state.wifiHidden ? 'H:true;' : ''
        const pass = state.wifiEncryption !== 'nopass' ? `P:${state.wifiPassword};` : ''
        return `WIFI:T:${state.wifiEncryption};S:${state.wifiSsid};${pass}${hidden};`

      case 'vcard':
        if (!state.vcardName) return null
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n'
        vcard += `FN:${state.vcardName}\n`
        if (state.vcardPhone) vcard += `TEL:${state.vcardPhone}\n`
        if (state.vcardEmail) vcard += `EMAIL:${state.vcardEmail}\n`
        if (state.vcardOrg) vcard += `ORG:${state.vcardOrg}\n`
        if (state.vcardUrl) vcard += `URL:${state.vcardUrl}\n`
        vcard += 'END:VCARD'
        return vcard

      case 'email':
        if (!state.emailTo) return null
        let mailto = `mailto:${state.emailTo}`
        const emailParams: string[] = []
        if (state.emailSubject) emailParams.push(`subject=${encodeURIComponent(state.emailSubject)}`)
        if (state.emailBody) emailParams.push(`body=${encodeURIComponent(state.emailBody)}`)
        if (emailParams.length) mailto += '?' + emailParams.join('&')
        return mailto

      case 'phone':
        if (!state.phoneNumber) return null
        return `tel:${state.phoneNumber.replace(/\s/g, '')}`

      case 'sms':
        if (!state.smsNumber) return null
        let sms = `sms:${state.smsNumber.replace(/\s/g, '')}`
        if (state.smsBody) sms += `?body=${encodeURIComponent(state.smsBody)}`
        return sms

      case 'geo':
        if (!state.geoLat || !state.geoLng) return null
        let geo = `geo:${state.geoLat},${state.geoLng}`
        if (state.geoLabel) geo += `?q=${encodeURIComponent(state.geoLabel)}`
        return geo

      default:
        return null
    }
  }

  async function handleGenerate(): Promise<void> {
    const data = getQRData()
    if (!data) {
      state.error = 'Bitte fülle die erforderlichen Felder aus.'
      state.qrDataUrl = null
      render()
      return
    }

    state.error = null

    try {
      // Generate QR code using canvas
      // @ts-expect-error - QRCode is loaded globally
      if (typeof QRCode !== 'undefined') {
        const canvas = document.createElement('canvas')
        // @ts-expect-error - QRCode is loaded globally
        await new Promise<void>((resolve, reject) => {
          // @ts-expect-error - QRCode is loaded globally
          QRCode.toCanvas(canvas, data, {
            width: state.size,
            margin: 2,
            errorCorrectionLevel: state.errorCorrection,
            color: {
              dark: state.fgColor,
              light: state.bgColor
            }
          }, (error: Error | null) => {
            if (error) reject(error)
            else resolve()
          })
        })
        state.qrDataUrl = canvas.toDataURL('image/png')

        // Generate SVG
        // @ts-expect-error - QRCode is loaded globally
        state.qrSvg = await new Promise<string>((resolve, reject) => {
          // @ts-expect-error - QRCode is loaded globally
          QRCode.toString(data, {
            type: 'svg',
            width: state.size,
            margin: 2,
            errorCorrectionLevel: state.errorCorrection,
            color: {
              dark: state.fgColor,
              light: state.bgColor
            }
          }, (error: Error | null, svg: string) => {
            if (error) reject(error)
            else resolve(svg)
          })
        })
      } else {
        // Fallback to API
        state.qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${state.size}x${state.size}&data=${encodeURIComponent(data)}&bgcolor=${state.bgColor.slice(1)}&color=${state.fgColor.slice(1)}`
        state.qrSvg = null
      }

      render()
    } catch (error) {
      console.error('QR generation error:', error)
      state.error = 'Fehler beim Generieren des QR-Codes.'
      render()
    }
  }

  function handleDownloadPng(): void {
    if (!state.qrDataUrl) return
    const link = document.createElement('a')
    link.download = `qr-${state.activeType}-${Date.now()}.png`
    link.href = state.qrDataUrl
    link.click()
  }

  function handleDownloadSvg(): void {
    if (!state.qrSvg) {
      state.error = 'SVG Export ist nur mit der lokalen QRCode Bibliothek verfügbar.'
      render()
      return
    }
    const blob = new Blob([state.qrSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `qr-${state.activeType}-${Date.now()}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopy(): Promise<void> {
    if (!state.qrDataUrl) return
    try {
      const response = await fetch(state.qrDataUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
    } catch {
      state.error = 'Kopieren wird von diesem Browser nicht unterstützt.'
      render()
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
