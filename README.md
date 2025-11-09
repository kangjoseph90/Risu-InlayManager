# Risu InlayManager

A plugin for RisuAI that provides comprehensive management of inlay assets (images, videos, and audio files) with an intuitive user interface.

## Overview

Risu InlayManager is a plugin designed to work with the RisuAI platform, offering a complete solution for managing inlay assets. It provides features for viewing, organizing, selecting, and managing multimedia assets that can be embedded within chat conversations.

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
git clone https://github.com/your-repo/Risu-InlayManager.git
cd Risu-InlayManager
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

## License

This project is proprietary and intended for use with RisuAI only.
