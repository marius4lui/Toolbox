// Tool Registry - Extensible architecture for adding new tools
import { Tool } from './types'
import { createImageCompressor } from './tools/imageCompressor'
import { icons } from './icons'

// Registry of all available tools
export const toolRegistry: Tool[] = [
    {
        id: 'image-compressor',
        name: 'Bildkompressor',
        description: 'Komprimiere Bilder ohne sichtbaren Qualitätsverlust. Unterstützt JPEG, PNG, WebP und AVIF.',
        icon: icons.compress,
        component: createImageCompressor
    }
    // Future tools can be added here:
    // {
    //   id: 'pdf-merger',
    //   name: 'PDF Merger',
    //   description: 'Kombiniere mehrere PDFs zu einem Dokument.',
    //   icon: icons.file,
    //   component: createPdfMerger
    // },
    // {
    //   id: 'color-picker',
    //   name: 'Color Picker',
    //   description: 'Extrahiere Farben aus Bildern und konvertiere Farbformate.',
    //   icon: icons.colorPicker,
    //   component: createColorPicker
    // },
]

// Get tool by ID
export function getToolById(id: string): Tool | undefined {
    return toolRegistry.find(tool => tool.id === id)
}

// Get all tools
export function getAllTools(): Tool[] {
    return toolRegistry
}
