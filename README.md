# Toolbox

A modern, futuristic desktop toolbox application built with Electron and TypeScript.

## Features

- 🖼️ **Image Compressor** - Compress images with Sharp (JPEG, PNG, WebP, AVIF)
- 🎨 **Modern UI** - Vercel-inspired dark theme with glassmorphism
- ⚡ **Fast** - Native performance with Electron
- 🔧 **Extensible** - Easy to add new tools

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## Tech Stack

- **Electron** 33+
- **TypeScript**
- **Vite** (via electron-vite)
- **Sharp** for image processing

## Adding New Tools

1. Create a new component in `src/renderer/src/tools/`
2. Register it in `src/renderer/src/toolRegistry.ts`
3. Add any necessary IPC handlers in `src/main/index.ts`

## License

MIT
