# Contributing to Forja Plugins

Thank you for your interest in contributing to the Forja plugin ecosystem. This guide covers everything you need to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Forja IDE](https://github.com/nandomoreirame/forja) installed (for manual testing)

## Setup

```bash
git clone https://github.com/nandomoreirame/forja-plugins.git
cd forja-plugins
pnpm install
```

## Project Structure

- `apps/forja-plugin-*/` - Individual plugins (TypeScript + Vite)
- `packages/forja-plugin-sdk/` - Shared SDK (`@forja/sdk`)
- `scripts/` - Build, validation, and release tooling
- `public/` - Marketplace landing page and generated registry

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

For new plugins, follow the [Creating a New Plugin](README.md#creating-a-new-plugin) section in the README.

For changes to existing plugins, edit the TypeScript source in `apps/forja-plugin-*/src/`.

### 3. Write Tests

Every plugin has tests under `src/__tests__/`. Add or update tests for your changes:

```bash
pnpm run test              # Run all tests
pnpm run test:watch        # Watch mode during development
pnpm run test:coverage     # Check coverage
```

### 4. Build and Validate

```bash
pnpm run build             # Build all plugins
pnpm run validate          # Validate manifests
pnpm run build:registry    # Regenerate registry
```

### 5. Test in Forja

Use dev mode to auto-sync built plugins to Forja's dev directory:

```bash
pnpm run dev               # Watch and sync all plugins
```

Plugins are synced to `~/.config/forja-dev/plugins/` for live testing.

### 6. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat(clock): add analog mode
fix(tasks): correct drag-drop ordering
docs(readme): update API reference
chore: update dependencies
```

## Plugin Guidelines

### Manifest

Every plugin needs a valid `manifest.json` with these required fields:

- `name` - Must match directory name and start with `forja-plugin-`
- `version` - Valid semver (managed by release scripts)
- `displayName` - Human-readable name
- `description` - Clear, concise description
- `entry` - Entry point file (usually `index.html`)

### Styling

- **Always** use `--forja-*` CSS variables for colors
- **Never** hardcode color values
- Listen to the `theme-changed` event for dynamic theme updates

### Permissions

Request only the permissions your plugin needs. See the [permission levels](README.md#theme-system) in the README.

| Permission | Risk | Use When |
|------------|------|----------|
| `theme.current` | Low | Reading theme data |
| `notifications` | Low | Showing desktop notifications |
| `project.active` | Low | Reading active project info |
| `fs.read` | Low-Medium | Reading project files |
| `fs.write` | High | Writing project files |
| `terminal.execute` | Critical | Running terminal commands |

### TypeScript

- Source code goes in `src/` with a `main.ts` entry point
- Use the shared `@forja/sdk` package for typed utilities
- Each plugin has its own `tsconfig.json` extending `tsconfig.base.json`
- Each plugin has its own `vite.config.ts` extending `vite.config.base.ts`

## Reporting Issues

Open an issue on [GitHub Issues](https://github.com/nandomoreirame/forja-plugins/issues) with:

- A clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Forja version and OS

## Pull Requests

1. Fork the repository and create your branch from `main`
2. Write tests for your changes
3. Ensure all tests pass (`pnpm run test`)
4. Validate manifests (`pnpm run validate`)
5. Build successfully (`pnpm run build`)
6. Open a PR with a clear description of what changed and why

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
