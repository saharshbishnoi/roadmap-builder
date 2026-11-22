#!/bin/sh
# Publishes the site to GitHub Pages from a branch, with no GitHub Actions involved.
#
#   ./publish-pages.sh            build the release in Docker, then publish
#   FILM=1 ./publish-pages.sh     also re-record the product film first
#   BUILD=0 ./publish-pages.sh    publish the dist/site folder that is already there
#
# The built site (app, fonts, guide videos, product film) is pushed to the gh-pages branch as ONE commit that
# replaces the previous one, so the branch never grows and main stays free of binaries.
# One-time setup on GitHub: Settings > Pages > Source: "Deploy from a branch", branch gh-pages, folder / (root).
set -eu
cd "$(dirname "$0")"
REMOTE=${REMOTE:-origin}
BRANCH=${BRANCH:-gh-pages}

if [ "${BUILD:-1}" = 1 ]; then
  rm -rf dist
  docker buildx build --build-arg RELEASE=1 --target dist --output type=local,dest=dist .
fi
[ -f dist/site/index.html ] || { echo "dist/site is missing. Run without BUILD=0 to build it."; exit 1; }

if [ "${FILM:-0}" = 1 ]; then
  FILM_UID=$(id -u) FILM_GID=$(id -g) docker compose -f film/compose.yml run --rm film
fi
# The product film goes on the hosted site only. GitHub refuses files over 100 MB, so the 4K master stays behind
# unless it is small enough; the 1080p copy is what the site plays.
if [ -f film/out/roadmap-builder-film-1080p.mp4 ]; then
  mkdir -p dist/site/film
  for f in roadmap-builder-film-1080p.mp4 roadmap-builder-film.vtt roadmap-builder-film.srt roadmap-builder-film-poster.jpg chapters.txt; do cp "film/out/$f" dist/site/film/; done
  k4=film/out/roadmap-builder-film-4k.mp4
  if [ -f "$k4" ] && [ "$(wc -c < "$k4")" -lt 99000000 ]; then cp "$k4" dist/site/film/; else echo "The 4K film is over GitHub's 100 MB file limit and is not published; the site plays the 1080p copy."; fi
else
  echo "No film in film/out: the site is published without the Watch the tour bar. Use FILM=1 to record it."
fi

big=$(find dist/site -type f -size +99M | head -5)
[ -z "$big" ] || { echo "These files are over GitHub's 100 MB limit and cannot be published:"; echo "$big"; exit 1; }

what=$(git describe --tags --always --dirty)
url=$(git remote get-url "$REMOTE")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -r dist/site/. "$work"/
touch "$work/.nojekyll"          # serve the files exactly as they are
cd "$work"
git init -q -b "$BRANCH"
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" commit -q -m "Site built from $what"
git push -f "$url" "$BRANCH"
echo "Published $what to the $BRANCH branch: $(find . -type f -not -path './.git/*' | wc -l) files, $(du -sh --exclude=.git . | cut -f1)."
