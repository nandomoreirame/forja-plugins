#!/usr/bin/env bash
set -euo pipefail

# Release plugins: bump version across package.json and all manifests,
# package as tar.gz, create GitHub Releases, upload assets.
#
# Usage:
#   ./scripts/release-plugin.sh <version>          # e.g. 2.1.0
#   ./scripts/release-plugin.sh <version> --dry-run # preview without releasing
#
# Requirements: gh CLI authenticated, jq

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGINS_DIR="$ROOT_DIR/plugins"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_JSON="$ROOT_DIR/package.json"
DRY_RUN=false

# --- Validation ---

validate_semver() {
  if [[ ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid semver version: $1" >&2
    echo "Expected format: X.Y.Z (e.g. 2.1.0)" >&2
    exit 1
  fi
}

# --- Version sync ---

bump_versions() {
  local new_version="$1"
  local current_version

  current_version=$(jq -r '.version' "$PACKAGE_JSON")
  echo "==> Bumping version: $current_version -> $new_version"
  echo ""

  # Update package.json
  jq --arg v "$new_version" '.version = $v' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp"
  mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"
  echo "    Updated: package.json"

  # Update all plugin manifests
  for dir in "$PLUGINS_DIR"/*/; do
    local manifest="$dir/manifest.json"
    if [[ -f "$manifest" ]]; then
      jq --arg v "$new_version" '.version = $v' "$manifest" > "$manifest.tmp"
      mv "$manifest.tmp" "$manifest"
      echo "    Updated: $(basename "$dir")/manifest.json"
    fi
  done

  echo ""
}

# --- Package & Release ---

release_plugin() {
  local plugin_name="$1"
  local version="$2"
  local plugin_dir="$PLUGINS_DIR/$plugin_name"
  local manifest="$plugin_dir/manifest.json"

  local name tag tarball
  name=$(jq -r '.name' "$manifest")
  tag="${name}-v${version}"
  tarball="${name}-${version}.tar.gz"

  echo "==> Packaging $name@$version"
  mkdir -p "$DIST_DIR"

  tar -czf "$DIST_DIR/$tarball" -C "$PLUGINS_DIR" "$plugin_name"
  echo "    Created: dist/$tarball ($(du -h "$DIST_DIR/$tarball" | cut -f1))"

  local sha256
  sha256=$(sha256sum "$DIST_DIR/$tarball" | cut -d' ' -f1)
  echo "    SHA256:  $sha256"

  if [[ "$DRY_RUN" == true ]]; then
    echo "    [dry-run] Would create release $tag"
    echo ""
    return
  fi

  if gh release view "$tag" &>/dev/null; then
    echo "    Release $tag already exists. Uploading asset (overwrite)..."
    gh release upload "$tag" "$DIST_DIR/$tarball" --clobber
  else
    echo "    Creating release $tag..."
    gh release create "$tag" \
      "$DIST_DIR/$tarball" \
      --title "$name v$version" \
      --notes "Release of $name version $version (SHA256: $sha256)" \
      --latest=false
  fi

  echo "    Done: https://github.com/nandomoreirame/forja-plugins/releases/tag/$tag"
  echo ""
}

# --- Main ---

if [[ $# -eq 0 ]]; then
  current=$(jq -r '.version' "$PACKAGE_JSON")
  echo "Usage: $0 <version> [--dry-run]"
  echo ""
  echo "Current version: $current"
  echo ""
  echo "Plugins:"
  for dir in "$PLUGINS_DIR"/*/; do
    if [[ -f "$dir/manifest.json" ]]; then
      echo "  - $(jq -r '.name' "$dir/manifest.json")@$(jq -r '.version' "$dir/manifest.json")"
    fi
  done
  exit 1
fi

VERSION="$1"
validate_semver "$VERSION"

if [[ "${2:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "[DRY RUN MODE]"
  echo ""
fi

bump_versions "$VERSION"

echo "==> Releasing all plugins at v${VERSION}..."
echo ""

for dir in "$PLUGINS_DIR"/*/; do
  if [[ -f "$dir/manifest.json" ]]; then
    release_plugin "$(basename "$dir")" "$VERSION"
  fi
done

if [[ "$DRY_RUN" == false ]]; then
  echo "==> Rebuilding registry..."
  node "$ROOT_DIR/scripts/build-registry.mjs"
  echo ""
fi

echo "All done!"
