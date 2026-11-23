# syntax=docker/dockerfile:1
# The quality report: known vulnerabilities (CVEs) and an inventory of what is packaged, static analysis, and
# test coverage, gathered into one page of figures. It reports; it never fails the build because of a finding.
#
#   ./quality/run.sh            writes dist/quality/ (open index.html)
#
# The build context is the repository root, with its own ignore file (quality/Dockerfile.dockerignore).
# Nothing here changes the app, its tests or the main Dockerfile. Tools are pinned: images by digest, Node
# packages by quality/package-lock.json.

# ---- pinned tools ------------------------------------------------------------------------------------------
FROM anchore/grype@sha256:661583704a253c0448ed63998b5ea2cd9d5a76ee71eedc4aed439b8ce3e93a1c AS grype
FROM anchore/syft@sha256:e97e20b6e6d1699c60296b66ab337941724f9bd06ac279d893eda89601fc4b2a AS syft
FROM koalaman/shellcheck@sha256:bb596a0d169b85ddd81d8b6d3a2ff6d5baf5fca10b97f575ebc647c3dff62b3d AS shellcheck
FROM hadolint/hadolint@sha256:32dac94127fd60b7b7e3fbfc65e1383b9b5e25c9bfd7b8536de7a539fe68a12d AS hadolint
FROM ghcr.io/astral-sh/ruff@sha256:2671e9bf3e50c24a88e731f209f9bf01c0360da6857ae36bca680b222efc3528 AS ruff

# ---- the app exactly as the main build assembles it: fetched libraries and fonts, standalone template -------
FROM node:22-alpine AS assets
WORKDIR /assets
COPY assets/ ./
RUN npm ci --ignore-scripts --no-audit --no-fund && sh ./collect.sh

FROM node:22-alpine AS site
COPY app/ /site/
COPY --from=assets /out/ /site/
COPY assets/standalone.mjs /standalone.mjs
RUN node /standalone.mjs /site /site/standalone-template.js

# ---- 1. vulnerabilities and inventory -------------------------------------------------------------------------
FROM alpine:3.20 AS scan
RUN apk add --no-cache ca-certificates
COPY --from=grype /grype /usr/local/bin/grype
COPY --from=syft /syft /usr/local/bin/syft
# Three groups, kept apart: what is packaged with the app, the image that serves it, and what only builds it.
COPY assets/package.json assets/package-lock.json /src/shipped/
COPY film/package.json film/package-lock.json film/requirements.txt /src/build/film/
COPY release/package.json /src/build/release/
COPY quality/package.json quality/package-lock.json /src/build/quality/
COPY quality/scan.sh /scan.sh
# The vulnerability database changes daily. SCAN_DATE (set by run.sh) makes Docker run the scan again each day
# instead of reusing yesterday's result.
ARG SCAN_DATE=unset
ARG SERVE_IMAGE=nginx:1.27-alpine
RUN SCAN_DATE="$SCAN_DATE" SERVE_IMAGE="$SERVE_IMAGE" sh /scan.sh

# ---- 2. static analysis ---------------------------------------------------------------------------------------
FROM node:22-alpine AS lint
WORKDIR /q
COPY quality/package.json quality/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY --from=shellcheck /bin/shellcheck /usr/local/bin/shellcheck
COPY --from=hadolint /bin/hadolint /usr/local/bin/hadolint
COPY --from=ruff /ruff /usr/local/bin/ruff
COPY . /src/
COPY quality/eslint.config.mjs quality/stylelint.config.mjs quality/htmlvalidate.json quality/lint.sh ./
RUN sh /q/lint.sh

# ---- 3. the browser tests again, this time recording which code they run ----------------------------------------
FROM mcr.microsoft.com/playwright:v1.49.1-noble AS coverage
WORKDIR /work/release
COPY quality/package.json quality/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY --from=site /site/ /work/app/
COPY release/serve.mjs ./
COPY release/tests/ ./tests/
COPY quality/coverage/ ./
# The tests are used as they are. Only this copy has its import pointed at a wrapper that switches coverage on.
RUN sed -i 's#from "@playwright/test";#from "../fixture.mjs";#' tests/*.spec.mjs && grep -c 'fixture.mjs' tests/*.spec.mjs
RUN mkdir -p /report/raw && (npx playwright test; echo $? > /report/raw/tests.exit) && ls /report/coverage

# ---- 4. one page of figures ------------------------------------------------------------------------------------
FROM node:22-alpine AS report
COPY --from=scan /report/ /report/
COPY --from=lint /report/ /report/
COPY --from=coverage /report/ /report/
COPY --from=site /site/ /site/
COPY . /src/
COPY quality/report.mjs /report.mjs
ARG SCAN_DATE=unset
ARG VERSION=working copy
RUN SCAN_DATE="$SCAN_DATE" VERSION="$VERSION" node /report.mjs /report /site /src && cat /report/SUMMARY.md

FROM scratch AS out
COPY --from=report /report/ /
