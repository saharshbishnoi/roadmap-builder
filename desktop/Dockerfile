# syntax=docker/dockerfile:1
# Builds the Roadmap Builder desktop app for Linux (AppImage and .deb) with Tauri. Build context is the repository root:
#
#   docker buildx build -f desktop/Dockerfile --target out --output type=local,dest=desktop/out .
#
# Windows and macOS installers have to be built on those systems (or in a hosted pipeline); this file is Linux only.
ARG NODE=node:22.12.0-bookworm-slim@sha256:35531c52ce27b6575d69755c73e65d4468dba93a25644eed56dc12879cae9213

# ---- the app, as the product build assembles it: fetched libraries and fonts, standalone-page template ----
FROM ${NODE} AS site
WORKDIR /assets
COPY assets/ ./
RUN npm ci --ignore-scripts --no-audit --no-fund && sh ./collect.sh
COPY app/ /site/
RUN cp -r /out/. /site/ && node standalone.mjs /site /site/standalone-template.js && rm -f /site/sw.js /site/manifest.webmanifest

# ---- the desktop shell ----
FROM rust:1.83-bookworm AS build
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev librsvg2-bin libssl-dev \
      patchelf file xdg-utils curl wget ca-certificates \
      xvfb xauth imagemagick dbus-x11 \
 && rm -rf /var/lib/apt/lists/*
RUN cargo install tauri-cli --version 2.1.0 --locked
WORKDIR /desktop
COPY desktop/src-tauri/ src-tauri/
COPY --from=site /site/ site/
# App icons are drawn from the app's own SVG, so no pictures are kept in git.
RUN mkdir -p src-tauri/icons && cd src-tauri/icons \
 && rsvg-convert -w 32 -h 32 /desktop/site/icon.svg -o 32x32.png \
 && rsvg-convert -w 128 -h 128 /desktop/site/icon.svg -o 128x128.png \
 && rsvg-convert -w 256 -h 256 /desktop/site/icon.svg -o "128x128@2x.png" \
 && rsvg-convert -w 512 -h 512 /desktop/site/icon.svg -o icon.png
# AppImage tools are AppImages themselves; inside a container they must unpack instead of mounting.
ENV APPIMAGE_EXTRACT_AND_RUN=1 NO_STRIP=true
RUN cd src-tauri && cargo tauri build --bundles deb,appimage \
 && mkdir -p /out && cp target/release/bundle/deb/*.deb target/release/bundle/appimage/*.AppImage /out/ \
 && cp target/release/roadmap-builder /out/roadmap-builder-linux-x86_64 && cp Cargo.lock /out/Cargo.lock && ls -la /out

FROM scratch AS out
COPY --from=build /out/ /
