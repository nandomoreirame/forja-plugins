#!/usr/bin/env node

/**
 * Build registry.json from plugin manifests in plugins/ directory.
 *
 * Usage: node scripts/build-registry.mjs
 *
 * Reads each plugin's manifest.json and produces a registry.json file
 * that can be served via GitHub Pages.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PLUGINS_DIR = join(import.meta.dirname, "..", "plugins");
const REGISTRY_PATH = join(import.meta.dirname, "..", "public", "registry.json");
const GITHUB_REPO = "nandomoreirame/forja-plugins";

async function buildRegistry() {
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory());

  const plugins = [];

  for (const dir of pluginDirs) {
    const manifestPath = join(PLUGINS_DIR, dir.name, "manifest.json");
    try {
      const raw = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);

      plugins.push({
        name: manifest.name,
        displayName: manifest.displayName,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        icon: manifest.icon || "Puzzle",
        tags: manifest.tags || [],
        downloads: 0,
        minForjaVersion: manifest.minForjaVersion || "1.0.0",
        permissions: manifest.permissions || [],
        downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/${manifest.name}-v${manifest.version}/${manifest.name}-${manifest.version}.tar.gz`,
        sha256: "",
      });

      console.log(`  + ${manifest.name}@${manifest.version}`);
    } catch (err) {
      console.error(`  ! Skipping ${dir.name}: ${err.message}`);
    }
  }

  plugins.sort((a, b) => a.name.localeCompare(b.name));

  const registry = { version: 1, plugins };
  await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");

  console.log(`\nRegistry written with ${plugins.length} plugin(s).`);
}

buildRegistry().catch((err) => {
  console.error("Failed to build registry:", err);
  process.exit(1);
});
