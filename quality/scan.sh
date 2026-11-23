#!/bin/sh
# Known vulnerabilities (Grype) and an inventory in CycloneDX form (Syft), for three groups kept apart.
# A finding never fails this script; a tool that cannot run is recorded in /report/raw/scan.log.
set -u
R=/report/raw; S=/report/sbom
mkdir -p "$R" "$S"
log() { echo "$*" | tee -a "$R/scan.log"; }
log "scan date: ${SCAN_DATE:-unset}"
grype version 2>&1 | grep -E '^(Version|Supported DB Schema)' | tee -a "$R/scan.log"
syft version 2>&1 | grep -E '^Version' | tee -a "$R/scan.log"

one() { # name, target
  syft "$2" -q -o "cyclonedx-json=$S/$1.cdx.json" 2>>"$R/scan.log" || log "syft failed for $1"
  grype "$2" -q -o json --file "$R/cve-$1.json" 2>>"$R/scan.log" || log "grype failed for $1"
}
one shipped "dir:/src/shipped"
one build   "dir:/src/build"
one image   "registry:${SERVE_IMAGE}"
grype db status 2>&1 | tee -a "$R/scan.log" || true
# release/ has no lock file, so its packages cannot be listed or scanned from here.
[ -f /src/build/release/package-lock.json ] || log "note: release/package.json has no lock file; its packages are not in this scan"
ls -la "$R" "$S"
exit 0
