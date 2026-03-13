# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this

Plugin registry and monorepo for the **Forja IDE**. Contains official plugins (vanilla JS, no build step) and tooling to validate manifests and generate a public registry consumed by Forja's plugin manager.

## Commands

```bash
pnpm run validate         # Validate all plugin manifests (name, version, entry, structure)
pnpm run build:registry   # Generate public/registry.json from plugin manifests
```

### Releasing

All plugins share one version (synced across `package.json` and every `manifest.json`).

```bash
./scripts/release-plugin.sh <version>            # Bump, package, and release all plugins
./scripts/release-plugin.sh <version> --dry-run   # Preview without creating releases
```

The CI workflow `.github/workflows/release-plugin.yml` also creates releases automatically on tag push matching `forja-plugin-*-v*`.

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
  validate-plugins.mjs    # Checks manifests: required fields, kebab-case name, semver, entry exists
  build-registry.mjs      # Reads manifests -> outputs public/registry.json with download URLs
  release-plugin.sh       # Bump version, package all plugins, create GitHub Releases

public/
  index.html              # Marketplace landing page (deployed via GitHub Pages)
  registry.json           # Generated file (run build:registry). Do not edit manually.
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

## Version Sync (MANDATORY)

All plugins MUST share the same version. When executing a git-flow release (`release.sh start`), the version in `package.json` is updated automatically by the script, but **Claude MUST also update the `version` field in every `plugins/*/manifest.json`** to match the release version. This keeps all files in sync.

**Files to update on every release:**
- `package.json` (root)
- `plugins/forja-plugin-*/manifest.json` (all plugins)

After updating all versions, always run `pnpm run build:registry` to regenerate `public/registry.json` with the new version before committing.

If using the `release-plugin.sh` script, this is handled automatically. If using the `git-flow` skill directly, Claude must update the manifest files and rebuild the registry manually before finishing the release.

## Creating a new plugin

1. Create `plugins/forja-plugin-<name>/` with `manifest.json` and `index.html`
2. Run `pnpm run validate` to check the manifest
3. Run `pnpm run build:registry` to update `registry.json`
4. Use `plugins/forja-plugin-pomodoro/` as reference (its README documents the full API and theme system)
