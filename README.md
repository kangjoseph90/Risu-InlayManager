# RIsu Inlay Manager Plugin

A RisuAI plugin that provides a gallery interface for managing and viewing inlay assets (images, videos, and audio) used in your conversations.

## Description

The Risu Inlay Manager automatically tracks all media assets used in your RisuAI conversations and organizes them in a clean, searchable gallery. It categorizes inlays by type (image, video, audio) and displays them sorted by most recently used, making it easy to find and reuse assets.

## Features

- **Automatic Asset Tracking**: Detects and catalogs all inlays as they're used in conversations
- **Organized Gallery**: Tabbed interface separating images, videos, and audio files
- **Time-based Sorting**: Displays assets in order of most recent usage
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Efficient Storage**: Uses IndexedDB for metadata and LocalForage for asset data

## Installation

1. Build the plugin:
```bash
npm run build
```

2. Locate the compiled plugin file at `dist/inlay-manager.js`

3. Import the JavaScript file into RisuAI

## Usage

After installation, a "갤러리" (Gallery) button will appear in the RisuAI interface. Click it to:

- Browse all your inlay assets organized by type
- View recently used media
- Access previously used images, videos, and audio files

The gallery updates automatically as you use new inlays in your conversations.

## Technical Details

- **Version**: v0.1.0
- **Type**: RisuAI Plugin
- **Output**: Single JavaScript file (UMD module)
- **Technologies**: TypeScript, Svelte, Tailwind CSS, IndexedDB, LocalForage

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build
```

The build process compiles all components into a single JavaScript file ready for import into RisuAI.
