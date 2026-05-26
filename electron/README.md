## Overview

**Prostgles Desktop** is a native desktop application based on Electron available for Linux, MacOS and Windows.
It has a subset of the core features from [Prostgles UI](../README.md) for data exploration and database management.
User Management and other multi-user focused features are not available in the desktop version.

### Installation

Pre-built installation files can be installed as described [here](<../docs/03_Installation_(Desktop_Version).md>)

### Building

Download the source code:

```
git clone https://github.com/prostgles/ui.git
cd ui/electron
```

The build commands are specific to your operating system: `build-linux`, `build-macos` or `build-win`.

Consult [our workflow file](../.github/workflows/on_release.yml) to get up to date build commands for your platform

For example, the command to build for MacOS is:

```
npm run build-macos
```

Which will build and save the installation files in the `./dist` directory

```
cd dist
```
