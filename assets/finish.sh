#!/bin/sh
# Finishes the built site in /site: app icons, the offline file list and version stamp, and the downloadable zip.
set -eu
cd /site
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
# Everything except the guide media is stored for offline use when the app is installed.
FILES=$(find . -type f ! -path './guide/*' ! -name sw.js | sort | sed 's|^\./||' | awk '{printf ",\"%s\"", $0}')
VERSION=$(find . -type f ! -path './guide/*' | sort | xargs sha256sum | sha256sum | cut -c1-12)
sed -i "s|/\*FILES\*/|\"./\"$FILES|; s|__BUILD__|$VERSION|" sw.js
grep -q '__BUILD__' sw.js && { echo "sw.js was not stamped"; exit 1; }
# The zip: the whole site in one folder, opened by double-clicking index.html.
mkdir -p /dist /zip/roadmap-builder
cp -r /site/. /zip/roadmap-builder/
cat > /zip/roadmap-builder/HOW-TO-OPEN.txt <<'TXT'
Roadmap Builder

Open index.html in Chrome or Edge. Nothing needs to be installed and no internet connection is needed.

Your roadmap is kept by the browser for this folder. If you move or rename the folder, export your
roadmap first (Export, Roadmap file) and import it again afterwards.
TXT
cd /zip && zip -q -r -9 /dist/roadmap-builder.zip roadmap-builder
ls -la /dist && echo "site version $VERSION, $(find /site -type f | wc -l) files, $(du -sh /site | cut -f1)"
