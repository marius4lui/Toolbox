// Tool Registry - Extensible architecture for adding new tools
import { Tool } from './types'
import { createImageCompressor } from './tools/imageCompressor'
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
        id: 'qr-generator',
        name: 'QR-Code Generator',
        description: 'Erstelle QR-Codes mit kurzen URLs für einfaches Teilen und Tracking.',
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
