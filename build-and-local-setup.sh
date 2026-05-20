#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="${1:-/tmp/ripplegraph-agent-test}"

cd "$REPO_ROOT"

echo "Building ripplegraph..."
npm run build

echo "Packing ripplegraph..."
TARBALL="$(npm pack --silent)"
TARBALL_PATH="$REPO_ROOT/$TARBALL"

echo "Installing ripplegraph globally from tarball..."
npm install -g "$TARBALL_PATH"

echo "Preparing local test project at $TEST_DIR..."
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
ripplegraph-demo init "$TEST_DIR"

echo
echo "Globally installed ripplegraph from tarball:"
echo "  $TARBALL_PATH"
echo
echo "Workflow status:"
ripplegraph-demo status --workflow-root "$TEST_DIR"

echo
echo "Next: open Claude/Codex in $TEST_DIR and ask it to drive the workflow with ripplegraph-demo."
