// Tool Registry - Extensible architecture for adding new tools
import { Tool } from './types'
import { createImageCompressor } from './tools/imageCompressor'
import { createImageConverter } from './tools/imageConverter'
import { createQrGenerator } from './tools/qrGenerator'
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
        id: 'qr-generator',
        name: 'Link & QR-Code',
        description: 'Erstelle kurze Links und QR-Codes mit optionalem Login für unbegrenzte Links und Verwaltung.',
        icon: icons.qrcode,
        component: createQrGenerator
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
