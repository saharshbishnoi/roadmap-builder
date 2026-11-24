#!/bin/sh
# Copies the files the app serves out of node_modules into /out/vendor and /out/fonts.
set -eu
mkdir -p /out/vendor /out/fonts
cp node_modules/marked/marked.min.js /out/vendor/marked.min.js
cp node_modules/dompurify/dist/purify.min.js /out/vendor/purify.min.js
cp node_modules/html-to-image/dist/html-to-image.js /out/vendor/html-to-image.js
cp node_modules/jspdf/dist/jspdf.umd.min.js /out/vendor/jspdf.umd.min.js
for w in 400 500 600 700; do
  for f in barlow ibm-plex-sans inter open-sans source-sans-3; do cp "node_modules/@fontsource/$f/files/$f-latin-$w-normal.woff2" /out/fonts/; done
done
for w in 500 600 700; do cp "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-$w-normal.woff2" /out/fonts/; done
ls -la /out/vendor /out/fonts
