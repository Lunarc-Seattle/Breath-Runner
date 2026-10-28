#!/usr/bin/env bash
# Builds every tagged web version (web-v1, web-v2, ...) into <out>/v1/, <out>/v2/, ... so each one
# stays playable on GitHub Pages next to the current app at the root.
# The app uses a relative base and hash routing, so a build works unchanged in a subfolder.
#
# Usage: scripts/ci/build-versions.sh <out-dir>   (needs the tags fetched: fetch-depth 0)
set -euo pipefail

out="$(realpath "${1:?usage: build-versions.sh <out-dir>}")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for tag in $(git tag -l 'web-v*' --sort=version:refname); do
  version="${tag#web-}"
  echo "::group::Build $tag into $version/"
  git worktree add --detach "$work/$version" "$tag"
  (cd "$work/$version" && npm ci --no-audit --no-fund && npm run build)
  mkdir -p "$out/$version"
  cp -R "$work/$version/dist/." "$out/$version/"
  # Source maps aren't needed for an archived version.
  find "$out/$version" -name '*.map' -delete
  git worktree remove --force "$work/$version"
  echo "::endgroup::"
done
