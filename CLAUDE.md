# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this

Plugin registry and monorepo for the **Forja IDE**. Contains official plugins (vanilla JS, no build step) and tooling to validate manifests and generate a public registry consumed by Forja's plugin manager.

## Commands

```bash
pnpm run validate         # Validate all plugin manifests (name, version, entry, structure)
pnpm run build:registry   # Generate registry.json from plugin manifests
```

There are no tests, no linter, and no build step for plugins themselves. Plugins are plain HTML/CSS/JS.

## Architecture

```
plugins/                  # Each subdirectory is an independent plugin
  forja-plugin-*/
    manifest.json         # Required: name, version, displayName, description, entry, permissions
    index.html            # Required: entry point loaded by Forja's PluginHost
    app.js                # Plugin logic using the global `forja` API
    styles.css            # Styling (MUST use --forja-* CSS variables, no hardcoded colors)

scripts/
  validate-plugins.mjs   # Checks manifests: required fields, kebab-case name, semver, entry exists
  build-registry.mjs      # Reads manifests -> outputs registry.json with download URLs

registry.json             # Generated file (run build:registry). Do not edit manually.
```

### Plugin manifest schema

```json
{
  "name": "forja-plugin-<kebab-name>",
  "version": "X.Y.Z",
  "displayName": "Human Name",
  "description": "...",
  "author": "...",
  "icon": "LucideIconName",
  "entry": "index.html",
  "tags": ["productivity"],
  "permissions": ["theme.current", "notifications"],
  "minForjaVersion": "1.6.0"
}
```

Directory name must match `manifest.name`. Name must start with `forja-plugin-` followed by kebab-case.

### Forja Plugin API

Plugins run inside Forja's PluginHost and access the global `forja` object:

- `forja.project.getActive()` - active project info
- `forja.fs.readFile(path)` / `forja.fs.writeFile(path, content)` - project-scoped file I/O
- `forja.theme.getCurrent()` - current theme data
- `forja.notifications.show({ title, body })` - desktop notifications
- `forja.sidebar.setBadge(text)` - sidebar badge text
- `forja.on(event, callback)` - listen to events (`theme-changed`, `project-changed`)

### Theme system (mandatory)

All styling must use `--forja-*` CSS variables injected by the host. Key variables:

- Backgrounds: `--forja-bg-base`, `--forja-bg-surface`, `--forja-bg-overlay`
- Text: `--forja-text`, `--forja-text-sub`, `--forja-text-muted`
- Accent: `--forja-accent`, `--forja-accent-hover`
- Semantic: `--forja-success`, `--forja-warning`, `--forja-error`, `--forja-info`
- Colors: `--forja-magenta`, `--forja-cyan`, `--forja-red`, `--forja-yellow`, `--forja-green`, `--forja-blue`
- Border/shadow: `--forja-border`, `--forja-shadow`

Never hardcode colors. Listen to `theme-changed` event for dynamic updates.

### Permission levels

| Permission | Risk |
|---|---|
| project.active, theme.current, notifications | Low |
| git.status, git.log, git.diff, fs.read | Low-Medium |
| fs.write | High |
| terminal.output, terminal.execute | Critical |

### Distribution

Plugins are packaged as `.tar.gz` and published via GitHub Releases. The registry references download URLs in the format:
`https://github.com/nandomoreirame/forja-plugins/releases/download/{name}-v{version}/{name}-{version}.tar.gz`

## Creating a new plugin

1. Create `plugins/forja-plugin-<name>/` with `manifest.json` and `index.html`
2. Run `pnpm run validate` to check the manifest
3. Run `pnpm run build:registry` to update `registry.json`
4. Use `plugins/forja-plugin-pomodoro/` as reference (its README documents the full API and theme system)
