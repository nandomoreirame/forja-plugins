#!/usr/bin/env node

/**
 * Build registry.json from plugin manifests.
 *
 * Usage: node scripts/build-registry.mjs
 *
 * Reads each plugin's manifest.json (preferring dist/ over source)
 * and produces a registry.json file that can be served via GitHub Pages.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PLUGINS_DIR = join(import.meta.dirname, "..", "apps");
const DIST_DIR = join(import.meta.dirname, "..", "dist");
const REGISTRY_PATH = join(import.meta.dirname, "..", "public", "registry.json");
const GITHUB_REPO = "nandomoreirame/forja-plugins";

async function computeSha256(filePath) {
  try {
    const data = await readFile(filePath);
    return createHash("sha256").update(data).digest("hex");
  } catch {
    return "";
  }
}

async function buildRegistry() {
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory());

  const plugins = [];

  for (const dir of pluginDirs) {
    // Prefer built manifest (has injected version) over source manifest
    const distManifestPath = join(PLUGINS_DIR, dir.name, "dist", "manifest.json");
    const srcManifestPath = join(PLUGINS_DIR, dir.name, "manifest.json");
    let manifestPath;
    try {
      await readFile(distManifestPath);
      manifestPath = distManifestPath;
    } catch {
      manifestPath = srcManifestPath;
    }
    try {
      const raw = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);

      const tarball = `${manifest.name}-${manifest.version}.tar.gz`;
      const tarballPath = join(DIST_DIR, tarball);
      const sha256 = await computeSha256(tarballPath);

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
        sha256,
      });

      if (sha256) {
        console.log(`    sha256: ${sha256}`);
      }

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
