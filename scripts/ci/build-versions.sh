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
  # Say on the page that this is an archived version, with a way back to the latest one.
  # Inline styles are fine: the CSP allows 'unsafe-inline' for styles (not scripts).
  banner="<aside aria-label=\"Archived version\" style=\"position:fixed;left:16px;bottom:16px;z-index:60;max-width:calc(100vw - 32px);padding:10px 16px;border-radius:16px;background:#1e2432;color:#fff;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 12px 32px rgba(30,36,50,.25)\">You're viewing <strong>$version</strong>, an archived version · <a href=\"../\" style=\"color:#f0c754\">Go to the latest →</a></aside>"
  BANNER="$banner" perl -0pi -e 's/(<body[^>]*>)/$1\n    $ENV{BANNER}/' "$out/$version/index.html"
  grep -q 'aria-label="Archived version"' "$out/$version/index.html"
  git worktree remove --force "$work/$version"
  echo "::endgroup::"
done
