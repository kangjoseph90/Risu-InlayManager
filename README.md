# RIsu InlayManager

A plugin for RisuAI that provides comprehensive management of inlay assets (images, videos, and audio files) with an intuitive user interface.

## Overview

RIsu InlayManager is a plugin designed to work with the RisuAI platform, offering a complete solution for managing inlay assets. It provides features for viewing, organizing, selecting, and managing multimedia assets that can be embedded within chat conversations.

## Features

### Asset Management
- **Multi-format Support**: Handles images, videos, and audio files
- **Virtual Grid Display**: Efficient rendering of large asset collections with lazy loading
- **Asset Organization**: Sorts assets by creation date with newest first
- **Selection Mode**: Multi-select functionality with long-press gesture support
- **Batch Operations**: Delete and download multiple assets simultaneously

### User Interface
- **Responsive Design**: Adapts to different screen sizes with dynamic column layout
- **Asset Viewer**: Dedicated component for viewing different media types
- **Popup Viewer**: Full-screen modal for detailed asset viewing with navigation
- **Touch Gestures**: Swipe navigation support on mobile devices
- **Keyboard Shortcuts**: Arrow keys for navigation, Escape to close popups

### Performance Optimizations
- **Lazy Loading**: Assets only load when visible in viewport
- **Request Concurrency**: Limits simultaneous data requests to prevent overload
- **Cache Management**: Intelligent caching with automatic cleanup
- **Virtual Scrolling**: Efficient rendering of large asset collections

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/RIsu-InlayManager.git
cd RIsu-InlayManager
```

2. Install dependencies:
```bash
npm install
```

3. Build the plugin:
```bash
npm run build
```

4. Load the built plugin in RisuAI

## Development

### Project Structure

```
src/
├── api.ts              # RisuAI API integration
├── main.ts             # Plugin entry point
├── plugin.ts           # Plugin configuration
├── types.ts            # TypeScript type definitions
├── style.css           # Global styles
├── manager/            # Data management modules
│   ├── data.ts         # Asset data management with caching
│   ├── inlay.ts        # Inlay database operations
│   └── time.ts         # Timestamp management
├── tracker/            # Event tracking
│   └── time.ts         # Asset usage tracking
└── ui/                 # User interface components
    ├── index.ts        # UI initialization
    ├── Modal.svelte    # Modal component
    ├── OpenButton.svelte # Plugin activation button
    ├── components/     # Reusable UI components
    │   ├── AssetPopup.svelte # Full-screen asset viewer
    │   ├── AssetViewer.svelte # Individual asset display
    │   ├── Loading.svelte # Loading indicator
    │   └── VirtualGrid.svelte # Virtual scrolling grid
    └── tabs/            # Main interface tabs
        └── AssetTab.svelte # Main asset management interface
```

### Key Components

#### DataManager
Handles asset data with intelligent caching and request concurrency control:
- Manages a cache of up to 100 assets
- Limits concurrent requests to 5 at a time
- Automatically converts base64 data to object URLs
- Handles cleanup of unused resources

#### VirtualGrid
Provides efficient rendering of large asset collections:
- Only renders visible items plus a buffer
- Dynamically adjusts column count based on screen size
- Implements smooth scrolling with proper offset calculations

#### AssetViewer
Universal component for displaying different media types:
- Supports images, videos, and audio files
- Implements lazy loading for performance
- Provides appropriate controls for each media type
- Handles loading states and error conditions

#### AssetTab
Main interface for asset management:
- Displays assets in a virtual grid
- Implements selection mode with multi-select
- Provides batch operations for deletion and download
- Tracks asset creation times for sorting

### Building

The project uses Vite with Svelte for building:

```bash
# Development build with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Configuration

The plugin configuration is defined in [`src/plugin.ts`](src/plugin.ts:1):

```typescript
const PLUGIN_TITLE = 'InlayManager'
const PLUGIN_VERSION = 'v0.1.0'
const PLUGIN_NAME = `${PLUGIN_TITLE}-${PLUGIN_VERSION}`
```

### RisuAI Integration

The plugin integrates with RisuAI through the API defined in [`src/api.ts`](src/api.ts:1):

- **Data Storage**: Uses localForage for persistent storage
- **Event Tracking**: Monitors inlay usage through script handlers
- **UI Integration**: Adds a button to the RisuAI settings interface

## Usage

### Viewing Assets
1. Click the InlayManager button in RisuAI settings
2. Browse through your assets in the grid view
3. Click any asset to view it in a full-screen popup
4. Use arrow keys or swipe gestures to navigate between assets

### Managing Assets
1. Long-press on an asset to enter selection mode
2. Select multiple assets by tapping them
3. Use the toolbar buttons to:
   - Download selected assets
   - Delete selected assets
   - Exit selection mode

### Technical Details

#### Asset Storage
- Assets are stored using localForage in IndexedDB
- Each asset includes metadata (name, type, dimensions, creation time)
- Time tracking is maintained separately for sorting

#### Performance Considerations
- Virtual scrolling prevents DOM bloat with large collections
- Lazy loading reduces initial page load time
- Request queuing prevents browser overload
- Automatic cache cleanup prevents memory leaks

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit them
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Dependencies

- Svelte: UI framework
- localForage: Client-side storage
- Lucide Svelte: Icon components
- Tailwind CSS: Utility-first CSS framework
- Vite: Build tool and development server
- @datastructures-js/queue: Queue implementation for request management
