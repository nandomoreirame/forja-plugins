#!/usr/bin/env node

/**
 * Validate all plugin manifests in plugins/ directory.
 *
 * Checks:
 * - manifest.json exists and is valid JSON
 * - Required fields are present (name, version, displayName, description, entry)
 * - Name follows kebab-case convention
 * - Version is valid semver
 * - Entry file exists
 */

import { readdir, readFile, access } from "node:fs/promises";
import { join } from "node:path";

const PLUGINS_DIR = join(import.meta.dirname, "..", "apps");
const REQUIRED_FIELDS = ["name", "version", "displayName", "description", "entry"];
const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

let hasErrors = false;

async function validatePlugins() {
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory());

  for (const dir of pluginDirs) {
    const pluginDir = join(PLUGINS_DIR, dir.name);
    const manifestPath = join(pluginDir, "manifest.json");

    console.log(`Validating ${dir.name}...`);

    // Check manifest exists
    try {
      await access(manifestPath);
    } catch {
      error(dir.name, "manifest.json not found");
      continue;
    }

    // Parse manifest
    let manifest;
    try {
      const raw = await readFile(manifestPath, "utf-8");
      manifest = JSON.parse(raw);
    } catch (err) {
      error(dir.name, `Invalid JSON: ${err.message}`);
      continue;
    }

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!manifest[field]) {
        error(dir.name, `Missing required field: ${field}`);
      }
    }

    // Check name format
    if (manifest.name && !KEBAB_CASE_RE.test(manifest.name.replace(/^forja-plugin-/, ""))) {
      error(dir.name, `Name "${manifest.name}" is not valid kebab-case`);
    }

    // Check version format
    if (manifest.version && !SEMVER_RE.test(manifest.version)) {
      error(dir.name, `Version "${manifest.version}" is not valid semver`);
    }

    // Check entry file exists
    if (manifest.entry) {
      try {
        await access(join(pluginDir, manifest.entry));
      } catch {
        error(dir.name, `Entry file "${manifest.entry}" not found`);
      }
    }

    // Check dir name matches manifest name
    if (manifest.name && manifest.name !== dir.name) {
      error(dir.name, `Directory name "${dir.name}" does not match manifest name "${manifest.name}"`);
    }

    if (!hasErrors) {
      console.log(`  OK`);
    }
  }

  if (hasErrors) {
    console.error("\nValidation failed.");
    process.exit(1);
  } else {
    console.log(`\nAll ${pluginDirs.length} plugin(s) valid.`);
  }
}

function error(plugin, message) {
  hasErrors = true;
  console.error(`  ERROR [${plugin}]: ${message}`);
}

validatePlugins().catch((err) => {
  console.error("Validation error:", err);
  process.exit(1);
});
