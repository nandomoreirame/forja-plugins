import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import type { Plugin, UserConfig } from 'vite'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

function copyDirSync(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

function copyManifest(): Plugin {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const cwd = process.cwd()
      const manifestSrc = join(cwd, 'manifest.json')
      const manifestDest = join(cwd, 'dist', 'manifest.json')
      try {
        const manifest = JSON.parse(readFileSync(manifestSrc, 'utf-8'))

        // Inject version from root package.json (single source of truth)
        const rootPkgPath = join(cwd, '..', '..', 'package.json')
        try {
          const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'))
          manifest.version = rootPkg.version
        } catch {
          // fallback: keep manifest version as-is
        }

        mkdirSync(join(cwd, 'dist'), { recursive: true })
        writeFileSync(manifestDest, JSON.stringify(manifest, null, 2) + '\n')
        console.log(`[copy-manifest] manifest.json copied to dist/ (v${manifest.version})`)
      } catch {
        // manifest.json is optional during dev
      }
    },
  }
}

function forjaSync(): Plugin {
  return {
    name: 'forja-sync',
    closeBundle() {
      if (!process.env.FORJA_WATCH) return

      const cwd = process.cwd()
      const manifestPath = join(cwd, 'manifest.json')

      let pluginName: string
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        pluginName = manifest.name as string
      } catch {
        console.warn('[forja-sync] Could not read manifest.json, skipping sync.')
        return
      }

      const homeDir = process.env.HOME || process.env.USERPROFILE || ''
      const destDir = join(homeDir, '.config', 'forja-dev', 'plugins', pluginName)

      const distDir = join(cwd, 'dist')
      try {
        copyDirSync(distDir, destDir)
        console.log(`[forja-sync] Synced dist/ → ${destDir}`)
      } catch (err) {
        console.error(`[forja-sync] Failed to sync to ${destDir}:`, err)
      }
    },
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export const baseConfig: UserConfig = {
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@forja/sdk': resolve(__dirname, 'packages/forja-plugin-sdk/src/index.ts'),
    },
  },
  plugins: [copyManifest(), forjaSync()],
}

export default baseConfig
