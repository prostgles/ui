# Prostgles Desktop

Electron Wrapper for Prostgles UI

## Overview

Prostgles Desktop is a cross platform PostgreSQL database tool. The focus is on providing one of the best sql writing and data exploration experience for PostgreSQL for free

### Demo

Visit https://playground.prostgles.com

### Features

- SQL Editor with context-aware schema auto-completion and documentation extracts and hints
- Realtime data exploration dashboard with versatile layout system (tab and side-by-side view)
- Table view with controls to view related data, sort, filter and cross-filter
- Map and Time charts with aggregations
- Data insert/update forms with autocomplete
- Search all tables from public schema
- Media file display (audio/video/image/html/svg)
- Data import (CSV, JSON and GeoJSON)
- Backup/Restore (locally or to cloud)
- TypeScript server-side functions (experimental)
- LISTEN NOTIFY support

### Installation

Visit our [releases page](https://github.com/prostgles/ui/releases) to download the latest installation binaries.

### Building

Download the source code:

```
git clone https://github.com/prostgles/ui.git
cd ui/electron
```

The build commands are specific to your operating system: build-linux, build-macos or build-win.

Consult [our workflow file](../.github/workflows/on_release.yml) to get up to date build commands for your platform

MacOS build

```
npm run build-macos
```

Go to build files

```
cd dist
```
