#!/bin/sh
# Gathers everything for a GitHub release into dist/release-<version>/, ready to upload to the release tag.
#
#   ./package-release.sh v1.3.0            use dist/ and film/out as they are
#   BUILD=1 ./package-release.sh v1.3.0    run the release build first (tests, guide videos, site, zip)
#   FILM=1  ./package-release.sh v1.3.0    re-record the product film first
#
# Release notes are taken from docs/releases/<version>.md if that file exists.
set -eu
cd "$(dirname "$0")"
V=${1:?Give the version, for example: ./package-release.sh v1.3.0}
OUT=dist/release-$V

if [ "${BUILD:-0}" = 1 ]; then rm -rf dist/site dist/roadmap-builder.zip; docker buildx build --build-arg RELEASE=1 --target dist --output type=local,dest=dist .; fi
if [ "${FILM:-0}" = 1 ]; then FILM_UID=$(id -u) FILM_GID=$(id -g) docker compose -f film/compose.yml run --rm film; fi

need() { [ -f "$1" ] || { echo "Missing $1. $2"; exit 1; }; }
need dist/roadmap-builder.zip "Run with BUILD=1 to make it."
need dist/site/guide/01-read-light.mp4 "The guide videos are made by the release build: run with BUILD=1."
need film/out/roadmap-builder-film-4k.mp4 "Run with FILM=1 to record the film."

rm -rf "$OUT"; mkdir -p "$OUT"
cp dist/roadmap-builder.zip "$OUT/"
cp film/out/roadmap-builder-film-4k.mp4 film/out/roadmap-builder-film-1080p.mp4 film/out/roadmap-builder-film.srt "$OUT/"
cp film/out/chapters.txt "$OUT/roadmap-builder-film-chapters.txt"
# The guide videos on their own, zipped inside a container so nothing needs installing.
docker run --rm -v "$PWD/dist/site/guide:/guide:ro" -v "$PWD/$OUT:/out" -u "$(id -u):$(id -g)" alpine:3.20 sh -c \
  'cd / && tar -cf - guide | (cd /tmp && tar -xf - && mv guide roadmap-builder-guide-videos && busybox zip -q -r -0 /out/roadmap-builder-guide-videos.zip roadmap-builder-guide-videos)' 2>/dev/null \
  || docker run --rm -v "$PWD/dist/site/guide:/guide:ro" -v "$PWD/$OUT:/out" alpine:3.20 sh -c \
  "apk add --no-cache zip >/dev/null && mkdir /w && cp -r /guide /w/roadmap-builder-guide-videos && cd /w && zip -q -r -0 /out/roadmap-builder-guide-videos.zip roadmap-builder-guide-videos && chown $(id -u):$(id -g) /out/roadmap-builder-guide-videos.zip"
[ -f "docs/releases/$V.md" ] && cp "docs/releases/$V.md" "$OUT/RELEASE-NOTES.md"
(cd "$OUT" && sha256sum roadmap-builder*.zip roadmap-builder-film* > SHA256SUMS.txt)
echo "Release package for $V:"
ls -la "$OUT" | awk 'NR>1 && $9 !~ /^\.+$/ {printf "  %8.1f MB  %s\n", $5/1048576, $9}'
echo "Built from $(git describe --tags --always --dirty). Upload the files in $OUT to the $V release on GitHub."
