# syntax=docker/dockerfile:1
# Roadmap Builder: a static single-page app served by nginx. No outbound calls at runtime.
#
#   Everyday build:  docker compose up -d --build
#   Release build:   RELEASE=1 docker compose up -d --build
#
# Nothing binary is kept in git: fonts and libraries are fetched by the assets stage of every build, and a
# release build also runs every browser test (the build fails if one fails) and renders the narrated guide
# videos (4K, light and dark), subtitles and posters from the app as it is now. Builds need internet access.
ARG RELEASE=0

# ---- third-party libraries and fonts the app serves: fetched here, not kept in git ------------------------
FROM node:22-alpine AS assets
WORKDIR /assets
COPY assets/ ./
RUN npm ci --ignore-scripts --no-audit --no-fund && sh ./collect.sh

# ---- release tooling: browser, test runner, ffmpeg and the narration voice ---------------------------------
FROM mcr.microsoft.com/playwright:v1.49.1-noble AS tools
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates python3-venv && rm -rf /var/lib/apt/lists/*
# Kokoro text-to-speech (Apache 2.0 licence): a natural female voice for the guide videos. Model files pinned by checksum.
ARG VOICE_BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
ARG VOICE_MODEL_SHA256=7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5
ARG VOICE_STYLES_SHA256=bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d
RUN set -eu; mkdir -p /opt/voice; cd /opt/voice; \
    curl -fsSL -O "$VOICE_BASE/kokoro-v1.0.onnx"; curl -fsSL -O "$VOICE_BASE/voices-v1.0.bin"; \
    sha256sum kokoro-v1.0.onnx voices-v1.0.bin; \
    if [ -n "$VOICE_MODEL_SHA256" ]; then printf '%s  kokoro-v1.0.onnx\n%s  voices-v1.0.bin\n' "$VOICE_MODEL_SHA256" "$VOICE_STYLES_SHA256" | sha256sum -c -; fi
RUN python3 -m venv /opt/tts && /opt/tts/bin/pip install --no-cache-dir kokoro-onnx==0.6.1 soundfile==0.13.1 && /opt/tts/bin/pip freeze
WORKDIR /work/release
COPY release/package.json ./
RUN npm install --no-audit --no-fund

FROM tools AS release-1
COPY app/ /work/app/
COPY --from=assets /out/ /work/app/
COPY release/ ./
# 1. Every test must pass.
RUN npx playwright test
# 2. Rebuild the guide videos (4K, light and dark), subtitles and posters into /out/guide.
RUN node videos.mjs && ls -la /out/guide

# ---- everyday build: nothing extra ------------------------------------------------------------------------
FROM nginx:1.27-alpine AS release-0
RUN mkdir -p /out/guide

FROM release-${RELEASE} AS release

# ---- the image that runs -----------------------------------------------------------------------------------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY app/ /usr/share/nginx/html/
COPY --from=assets /out/ /usr/share/nginx/html/
COPY --from=release /out/guide/ /usr/share/nginx/html/guide/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
