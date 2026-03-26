# Forja Plugins

Official plugin registry and monorepo for [Forja IDE](https://github.com/nandomoreirame/forja). Contains production-ready plugins built with TypeScript and Vite, a shared plugin SDK, and tooling to validate manifests and generate a public registry.

## Plugins

| Plugin | Description | Scope | Permissions |
|--------|-------------|-------|-------------|
| [Clock](apps/forja-plugin-clock/) | Customizable clock with flip, digital, and minimal themes | Global | `theme.current` |
| [Pomodoro Timer](apps/forja-plugin-pomodoro/) | Pomodoro timer to track focus sessions while coding | Global | `theme.current`, `notifications` |
| [Markdown Tasks](apps/forja-plugin-tasks/) | Manage project tasks from a `TASKS.md` file | Project | `project.active`, `theme.current`, `fs.read`, `fs.write` |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9

### Install

```bash
git clone https://github.com/nandomoreirame/forja-plugins.git
cd forja-plugins
pnpm install
```

### Build

```bash
pnpm run build           # Build all plugins
pnpm run build:registry  # Generate public/registry.json
```

### Development

```bash
pnpm run dev                              # Watch all plugins (syncs to ~/.config/forja-dev/plugins/)
pnpm run dev:plugin forja-plugin-clock    # Watch a single plugin
```

When `FORJA_WATCH=1` is set, built plugins are automatically synced to `~/.config/forja-dev/plugins/<plugin-name>/` for live testing inside Forja.

### Test

```bash
pnpm run test             # Run all tests
pnpm run test:watch       # Watch mode
pnpm run test:coverage    # With coverage report
```

### Validate

```bash
pnpm run validate         # Validate all plugin manifests
```

## Architecture

```
apps/                         # Each subdirectory is an independent plugin
  forja-plugin-*/
    manifest.json             # Plugin metadata (name, version, permissions, etc.)
    index.html                # Entry point loaded by Forja's PluginHost
    src/                      # TypeScript source modules
      main.ts                 # Plugin bootstrap
      __tests__/              # Unit tests (Vitest)
    styles.css                # Styling (--forja-* CSS variables only)
    vite.config.ts            # Vite config extending the shared base
    package.json              # Workspace package
    tsconfig.json             # TypeScript config extending the shared base

packages/
  forja-plugin-sdk/           # Shared SDK (@forja/sdk)
    src/
      index.ts                # Public API exports
      types.ts                # Type definitions for the Forja Plugin API
      storage.ts              # Typed storage utilities
      theme.ts                # Theme helper utilities

scripts/
  validate-plugins.mjs        # Manifest validation (required fields, kebab-case, semver)
  build-registry.mjs           # Generates public/registry.json with download URLs
  release-plugin.sh            # Bump version, package plugins, create GitHub Releases

public/
  index.html                   # Marketplace landing page (GitHub Pages)
  registry.json                # Generated registry (do not edit manually)
```

## Creating a New Plugin

1. Create `apps/forja-plugin-<name>/` with at minimum `manifest.json`, `index.html`, and `src/main.ts`.

2. Add a `package.json`:

```json
{
  "name": "forja-plugin-<name>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch"
  }
}
```

3. Add a `vite.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vite'
import baseConfig from '../../vite.config.base'

export default mergeConfig(baseConfig, defineConfig({}))
```

4. Create `manifest.json` following the schema:

```json
{
  "name": "forja-plugin-<name>",
  "version": "1.0.0",
  "displayName": "Human Readable Name",
  "description": "What this plugin does.",
  "author": "Your Name",
  "icon": "LucideIconName",
  "entry": "index.html",
  "tags": ["productivity"],
  "permissions": ["theme.current"],
  "minForjaVersion": "1.6.0"
}
```

5. Validate and register:

```bash
pnpm run validate
pnpm run build:registry
```

Use any existing plugin in `apps/` as reference.

## Forja Plugin API

Plugins run inside Forja's PluginHost and access the global `forja` object:

```ts
forja.project.getActive()                    // Active project info
forja.fs.readFile(path)                      // Read project file
forja.fs.writeFile(path, content)            // Write project file
forja.theme.getCurrent()                     // Current theme data
forja.notifications.show({ title, body })    // Desktop notification
forja.sidebar.setBadge(text)                 // Sidebar badge
forja.on(event, callback)                    // Event listener
```

Events: `theme-changed`, `project-changed`.

## Theme System

All styling **must** use `--forja-*` CSS variables. Never hardcode colors.

| Category | Variables |
|----------|-----------|
| Background | `--forja-bg-base`, `--forja-bg-surface`, `--forja-bg-overlay` |
| Text | `--forja-text`, `--forja-text-sub`, `--forja-text-muted` |
| Accent | `--forja-accent`, `--forja-accent-hover` |
| Semantic | `--forja-success`, `--forja-warning`, `--forja-error`, `--forja-info` |
| Colors | `--forja-magenta`, `--forja-cyan`, `--forja-red`, `--forja-yellow`, `--forja-green`, `--forja-blue` |
| Border | `--forja-border`, `--forja-shadow` |

## Releasing

All plugins share a single version synced across `package.json` and every `manifest.json`.

```bash
./scripts/release-plugin.sh <version>            # Bump, package, and release all plugins
./scripts/release-plugin.sh <version> --dry-run   # Preview without creating releases
```

The CI workflow creates GitHub Releases automatically on tag push matching `forja-plugin-*-v*`.

## Distribution

Plugins are packaged as `.tar.gz` and published via GitHub Releases. The registry references download URLs at:

```
https://github.com/nandomoreirame/forja-plugins/releases/download/{name}-v{version}/{name}-{version}.tar.gz
```

## License

This project is licensed under the [MIT License](LICENSE.md).
