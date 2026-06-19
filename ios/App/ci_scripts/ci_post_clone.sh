#!/bin/sh
# Xcode Cloud post-clone hook for a Capacitor + Vite + React app.
#
# Why this exists: the Swift Package at CapApp-SPM/Package.swift references
# ../../../node_modules/@capacitor/* — so Xcode's package resolution step
# will fail unless node_modules/ exists. We also need a fresh web bundle
# in ios/App/App/public/ before xcodebuild runs, or the .app ships empty.
#
# This script runs *before* Xcode resolves Swift packages, which is exactly
# when we need npm install + cap sync to have happened.

set -e
set -x

echo "================================================================"
echo "  Xcode Cloud :: ci_post_clone.sh starting"
echo "================================================================"

echo "PWD before cd:           $(pwd)"
echo "Script path:             $0"
echo "CI_PRIMARY_REPOSITORY_PATH: ${CI_PRIMARY_REPOSITORY_PATH:-<unset>}"
echo "CI_WORKSPACE:            ${CI_WORKSPACE:-<unset>}"

# Move to repo root. Xcode Cloud sets CI_PRIMARY_REPOSITORY_PATH; if that's
# missing, fall back to four parents up from this script (ios/App/ci_scripts/).
if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
  REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
else
  REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
fi
cd "$REPO_ROOT"
echo "Repo root:               $(pwd)"
ls -la

# Skip Homebrew's auto-update step — it adds ~3 minutes per build.
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

# Install Node if not already on PATH (Apple's Xcode Cloud runners
# usually don't include it).
if ! command -v node >/dev/null 2>&1; then
  echo "node not found; installing via Homebrew..."
  brew install node
fi
echo "node version: $(node --version)"
echo "npm version:  $(npm --version)"

# Install JS deps. Prefer `npm ci` for reproducibility; fall back to
# `npm install` if the lockfile mismatches the package.json.
echo "Installing JS dependencies..."
npm ci --no-audit --no-fund || {
  echo "npm ci failed; falling back to npm install..."
  npm install --no-audit --no-fund
}

# Build the web bundle into dist/.
echo "Building web bundle..."
npm run build

# Copy dist/ into ios/App/App/public and refresh Capacitor's plugin manifest.
# This must happen before Swift package resolution; otherwise the iOS
# project can't find @capacitor/* packages referenced from
# CapApp-SPM/Package.swift.
echo "Syncing Capacitor (copies dist into ios/App/App/public)..."
npx --no-install cap sync ios || npx cap sync ios

# Sanity check: confirm the public folder has assets.
echo "Verifying public/ folder is populated:"
ls -la ios/App/App/public/ | head -20
test -f ios/App/App/public/index.html || {
  echo "ERROR: ios/App/App/public/index.html missing after sync!"
  exit 1
}

echo "================================================================"
echo "  ci_post_clone.sh finished cleanly"
echo "================================================================"
