# syntax=docker/dockerfile:1
# The film container: browser, ffmpeg, fonts, the recorder and the voice model. Nothing else is needed on the machine.
# Build context is the repository root:  docker compose -f film/compose.yml build
# Base image pinned by digest (node 22.12.0 on Debian bookworm).
ARG NODE=node:22.12.0-bookworm-slim@sha256:35531c52ce27b6575d69755c73e65d4468dba93a25644eed56dc12879cae9213

# ---- the real app, exactly as the product build assembles it: fetched libraries and fonts, standalone template ----
FROM ${NODE} AS app
WORKDIR /assets
COPY assets/ ./
RUN npm ci --ignore-scripts --no-audit --no-fund && sh ./collect.sh
COPY app/ /site/
RUN cp -r /out/. /site/ \
 && cp node_modules/@fontsource/inter/files/inter-latin-300-normal.woff2 /site/fonts/ \
 && node standalone.mjs /site /site/standalone-template.js

# ---- the recorder ----
FROM ${NODE}
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-venv curl ca-certificates fonts-liberation fonts-dejavu-core fonts-noto-core \
      libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 \
      libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 \
 && rm -rf /var/lib/apt/lists/*

# The voice: Kokoro (Apache 2.0). Model files are downloaded once, at build time, and checked against known checksums.
ARG VOICE_BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
RUN set -eu; mkdir -p /opt/voice; cd /opt/voice; \
    curl -fsSL -O "$VOICE_BASE/kokoro-v1.0.onnx"; curl -fsSL -O "$VOICE_BASE/voices-v1.0.bin"; \
    printf '%s  kokoro-v1.0.onnx\n%s  voices-v1.0.bin\n' \
      7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5 \
      bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d | sha256sum -c -
COPY film/requirements.txt /opt/requirements.txt
RUN python3 -m venv /opt/tts && /opt/tts/bin/pip install --no-cache-dir -r /opt/requirements.txt

# The browser: Chrome for Testing, the exact build that this Puppeteer version pins (see package-lock.json).
ENV PUPPETEER_CACHE_DIR=/opt/browser
WORKDIR /film
COPY film/package.json film/package-lock.json ./
RUN npm ci --no-audit --no-fund && npx puppeteer browsers list

COPY --from=app /site/ /film/app/
COPY film/record.mjs film/scenes.mjs film/speak.py film/stage.html ./
RUN mkdir -p /out /cache && chmod 777 /out /cache && chmod -R a+rX /opt /film

# Not root. Any user id works (compose passes yours), so files written to the output folder belong to you.
USER 1000:1000
ENV HOME=/tmp FILM_OUT=/out FILM_CACHE=/cache
ENTRYPOINT ["node", "record.mjs"]
