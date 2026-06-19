#!/bin/sh
# Xcode Cloud post-clone hook.
#
# Xcode Cloud checks out the repo into a temp dir and then builds the iOS
# project. For a Capacitor app that means we need:
#   1. Node.js (installed below via Homebrew)
#   2. `npm install` at the repo root to pull React/Vite/Supabase/etc.
#   3. `npm run build` to produce the dist/ web bundle
#   4. `npx cap sync ios` to copy the bundle into ios/App/App/public and
#      regenerate the Capacitor plugin manifest.
#
# Without this, Swift compilation succeeds but the .app ships with an
# empty public/ folder and the app launches into a white screen.

set -e

echo "== Xcode Cloud :: ci_post_clone.sh =="
echo "PWD: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

# Move to the repo root. Xcode Cloud sets CI_PRIMARY_REPOSITORY_PATH for us.
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$REPO_ROOT"
echo "Repo root: $(pwd)"

# Install Node if it's missing on the Xcode Cloud runner. Homebrew is
# preinstalled there.
if ! command -v node >/dev/null 2>&1; then
  echo "Node not found, installing via Homebrew..."
  brew install node
fi

echo "node: $(node --version)"
echo "npm:  $(npm --version)"

# Use a deterministic install. `npm ci` honors package-lock.json and is
# faster than `npm install` for CI.
echo "Installing JS dependencies..."
npm ci

echo "Building web bundle..."
npm run build

echo "Syncing Capacitor (copies dist into ios/App/App/public)..."
npx cap sync ios

echo "== ci_post_clone.sh finished cleanly =="
