// Tool Registry - Extensible architecture for adding new tools
import { Tool } from './types'
import { createImageCompressor } from './tools/imageCompressor'
import { createImageConverter } from './tools/imageConverter'
import { createLinkShortener } from './tools/linkShortener'
import { createPureQrGenerator } from './tools/pureQrGenerator'
import { icons } from './icons'

// Registry of all available tools
export const toolRegistry: Tool[] = [
    {
        id: 'image-compressor',
        name: 'Bildkompressor',
        description: 'Komprimiere Bilder ohne sichtbaren Qualitätsverlust. Unterstützt JPEG, PNG, WebP und AVIF.',
        icon: icons.compress,
        component: createImageCompressor
    },
    {
        id: 'image-converter',
        name: 'Format-Konverter',
        description: 'Konvertiere Bilder zwischen Formaten: JPEG, PNG, WebP, AVIF.',
        icon: icons.image,
        component: createImageConverter
    },
    {
        id: 'link-shortener',
        name: 'Link Weiterleiter',
        description: 'Erstelle kurze Links mit 31-Tage Gültigkeit. Login für unbegrenzte Links und Wiederherstellung abgelaufener Links.',
        icon: icons.link,
        component: createLinkShortener
    },
    {
        id: 'qr-generator',
        name: 'QR Code Generator',
        description: 'Erstelle QR-Codes für URLs, WiFi, Kontakte, E-Mails, Telefon, SMS und Standorte mit Farbanpassung.',
        icon: icons.qrcode,
        component: createPureQrGenerator
    }
    // Future tools can be added here
]

// Get tool by ID
export function getToolById(id: string): Tool | undefined {
    return toolRegistry.find(tool => tool.id === id)
}

// Get all tools
export function getAllTools(): Tool[] {
    return toolRegistry
}
