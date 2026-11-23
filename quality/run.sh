#!/bin/sh
# Makes the quality report in dist/quality/. Open dist/quality/index.html.
#
#   ./quality/run.sh              the working copy
#   ./quality/run.sh v1.4.3       the same, with a version shown on the report
#
# Report only: findings never fail this command. It fails only if a tool cannot be built or run.
set -eu
cd "$(dirname "$0")/.."
V=${1:-$(git describe --tags --always --dirty 2>/dev/null || echo "working copy")}
rm -rf dist/quality
docker buildx build -f quality/Dockerfile --build-arg SCAN_DATE="$(date -u +%F)" --build-arg VERSION="$V" --target out --output type=local,dest=dist/quality .
echo; cat dist/quality/SUMMARY.md; echo; echo "Report: dist/quality/index.html"
