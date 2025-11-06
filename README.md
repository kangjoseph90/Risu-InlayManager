# RIsu Inlay Manager Plugin

A RisuAI plugin for managing inlay assets (images, videos, and audio) with a user-friendly gallery interface.

## Overview

The RIsu Inlay Manager is a plugin for RisuAI that provides a comprehensive gallery interface to view and manage inlay assets. It automatically tracks and categorizes inlays by type (image, video, audio) and displays them in an organized interface with sorting capabilities.

## Features

- **Gallery Interface**: Clean, tabbed interface for viewing inlays by type
- **Asset Management**: View and organize images, videos, and audio files
- **Automatic Tracking**: Automatically detects and categorizes new inlays as they're used
- **Time-based Sorting**: Displays inlays sorted by most recently used
- **Metadata Storage**: Tracks creation time and type information for each inlay
- **Responsive Design**: Mobile-friendly interface that works across different screen sizes

## Installation

1. Build the plugin:
```bash
npm run build
```

2. The compiled plugin will be output to `dist/inlay-manager.js`

3. Import the JavaScript file into RisuAI

## Technical Architecture

### Core Components

#### Data Management
- **InlayManager** ([`src/manager/inlay.ts`](src/manager/inlay.ts)): Handles storage and retrieval of inlay data using LocalForage
- **TypeManager** ([`src/manager/meta.ts`](src/manager/meta.ts)): Manages type metadata for inlays using Dexie (IndexedDB)
- **TimeManager** ([`src/manager/meta.ts`](src/manager/meta.ts)): Tracks creation timestamps for inlays
- **UrlManager** ([`src/manager/url.ts`](src/manager/url.ts)): Converts inlay data to displayable URLs with caching

#### Tracking System
- **TimeTracker** ([`src/tracker/time.ts`](src/tracker/time.ts)): Monitors content for inlay usage and timestamps
- **TypeTracker** ([`src/tracker/type.ts`](src/tracker/type.ts)): Synchronizes inlay types and detects new/deleted inlays

#### Event System
- **InlayEventSystem** ([`src/events/InlayEventSystem.ts`](src/events/InlayEventSystem.ts)): Singleton event system for coordinating updates between components

#### User Interface
- **UI Manager** ([`src/ui/index.ts`](src/ui/index.ts)): Manages the UI lifecycle and button integration
- **Modal Component** ([`src/ui/Modal.svelte`](src/ui/Modal.svelte)): Main gallery interface with tabs
- **Tab Components**: Specialized views for each media type
  - ImageTab ([`src/ui/tabs/ImageTab.svelte`](src/ui/tabs/ImageTab.svelte))
  - VideoTab ([`src/ui/tabs/VideoTab.svelte`](src/ui/tabs/VideoTab.svelte))
  - AudioTab ([`src/ui/tabs/AudioTab.svelte`](src/ui/tabs/AudioTab.svelte))

### Data Flow

1. **Detection**: TimeTracker scans content for inlay references using regex patterns
2. **Tracking**: When new inlays are detected, their timestamps are recorded
3. **Synchronization**: TypeTracker syncs metadata between storage systems
4. **Display**: UI components listen for events and update the gallery view

### Storage Architecture

The plugin uses a dual-storage approach:
- **LocalForage**: Stores the actual inlay data (blobs, base64 strings)
- **Dexie (IndexedDB)**: Stores metadata (type, timestamps) for efficient querying

## Development

### Project Structure

```
src/
├── api.ts              # RisuAI plugin API interface
├── main.ts             # Plugin entry point
├── plugin.ts           # Plugin metadata and configuration
├── types.ts            # TypeScript type definitions
├── events/             # Event system implementation
│   └── InlayEventSystem.ts
├── manager/            # Data management modules
│   ├── inlay.ts        # Inlay data storage
│   ├── meta.ts         # Metadata management
│   └── url.ts          # URL conversion utilities
├── tracker/            # Asset tracking modules
│   ├── time.ts         # Time tracking
│   └── type.ts         # Type synchronization
└── ui/                 # User interface components
    ├── index.ts        # UI manager
    ├── Modal.svelte    # Main gallery modal
    ├── OpenButton.svelte # Gallery button
    └── tabs/           # Media type tabs
        ├── index.ts
        ├── ImageTab.svelte
        ├── VideoTab.svelte
        └── AudioTab.svelte
```

### Technologies Used

- **TypeScript**: Type-safe development
- **Svelte**: Component-based UI framework
- **Tailwind CSS**: Utility-first styling (with `im-` prefix to avoid conflicts)
- **Dexie**: IndexedDB wrapper for metadata storage
- **LocalForage**: Offline storage for inlay data
- **Lucide Svelte**: Icon library

### Building

```bash
npm run build
```

The build process:
1. Compiles TypeScript and Svelte components
2. Bundles all code into a single UMD module
3. Injects Tailwind CSS styles
4. Outputs to `dist/inlay-manager.js`

## Usage

1. After installation, a "갤러리" (Gallery) button will appear in the RisuAI settings
2. Click the button to open the inlay gallery
3. Use tabs to switch between image, video, and audio views
4. Inlays are automatically sorted by most recently used
5. The gallery updates automatically as new inlays are used in RisuAI

## Plugin Metadata

- **Name**: InlayManager
- **Version**: v0.1.0
- **Type**: RisuAI Plugin
- **Output**: Single JavaScript file (UMD module)

## Contributing

This plugin follows the RisuAI plugin development standards. When making changes:

1. Ensure TypeScript types are properly maintained
2. Follow the existing component structure
3. Test with different media types
4. Verify responsive design functionality
