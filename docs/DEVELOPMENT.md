# Development and integration

How to change Roadmap Builder, check the change, and get it out; and how to connect it to other things.
The README covers running and using the app. This file is for whoever changes it, a person or an AI agent.

## 1. Ground rules

1. **Everything builds in Docker.** The only tool needed on the machine is Docker. Do not install Node,
   Python, ffmpeg or a browser on the host, and do not add steps that need them there.
2. **Nothing binary goes into git.** Libraries, fonts, icons, videos, the film and the zip are fetched or
   made by the build (see `.gitignore`). If a change needs a new library or font, pin it in
   `assets/package.json` and copy it in `assets/collect.sh`.
3. **The app is plain files.** `app/index.html`, `app/styles.css` and `app/app.js`, with no framework and
   no bundler. Keep it that way: it is what lets the app run from a folder, as one exported file, and
   offline.
4. **Nothing is loaded from another host at run time.** The content security policy in `nginx.conf`
   forbids it, and the standalone export depends on it.
5. **Every change keeps the written help current**: the steps in `app/guide.js`, the README, and
   `docs/REQUIREMENTS.md`. Add or update a test in `release/tests/app.spec.mjs` for anything a user can
   see or do.
6. **Videos are re-recorded only for a candidate or final release build**, when asked. For ordinary
   changes, update the two scripts (`release/videos.mjs`, `film/scenes.mjs`) only if a step in them would
   now fail, and say that the recordings are behind the app.
7. **Licences.** The project is MIT. When a pinned version or a dependency changes, update
   `THIRD-PARTY-LICENSES.md` and `app/vendor/THIRD-PARTY.txt` in the same commit.

## 2. Where things are

| Path | What it is |
|---|---|
| `app/app.js` | All behaviour, in one file. State is the object `S`; view settings that are not part of the roadmap are in `ui` |
| `app/index.html`, `app/styles.css` | The page shell and all styling, including both themes |
| `app/guide.js` | The steps shown in the Guide dialog, and the download address |
| `app/sw.js`, `app/manifest.webmanifest` | Offline support and installing as a web app |
| `assets/` | What the build fetches (`package.json`), how it is copied in (`collect.sh`), how the standalone template is made (`standalone.mjs`) and how the site is finished (`finish.sh`: icons, offline file list, zip) |
| `release/` | Browser tests and the guide-video builder; used only by a release build |
| `film/` | The product film: scenes, recorder and its own container (`film/README.md`) |
| `docs/` | Requirements, ideas, design language, release notes, this file and the video prompt |
| `publish-pages.sh`, `package-release.sh` | Publish the site to the `gh-pages` branch; gather a release package |
| `.github/workflows/release.yml` | Builds a tagged release and attaches its files |
| `desktop/` | A Tauri scaffold. Written, never built; not part of any release |

### How the app is put together

- **State.** `S` is the roadmap (version 3): phases, activities, milestones, critical path, floating
  cards, panel cards and settings. It is kept in the browser's local storage under `roadmap-app-v2`;
  `ui` is kept under `roadmap-app-ui`. `normalise()` accepts any older or partial roadmap and returns a
  complete one; put new settings there with a default so old files keep opening.
- **Changing state.** Use `mutate(fn)` for a change that is one Undo step, `live(key, fn)` for typing
  (a burst of typing is one step), and `setView(fn)` for a setting that should not be undone.
- **Drawing.** `render()` rebuilds the markup and morphs it into the page, so focus and the caret
  survive. `render(true)` is the soft redraw used while typing. Rows carry ids so the morph can match
  them.
- **Actions.** A button with `data-act="name"` calls `ACT.name`. Add the function to `ACT`; do not attach
  listeners to individual buttons.
- **Dialogs.** `openSheet(html, wide)` and `closeSheet()`. The Guide is `openGuide()`.
- **Modes.** `body.edit` is Edit mode; elements with class `eo` show only there. `VIEWONLY` and `EMBED`
  mark a page exported as a standalone file.
- **Themes.** Colours are CSS variables on `:root`, redefined for dark. `isDark()` says which theme is
  showing; `applyTheme()` applies the settings.

## 3. Day-to-day development

Run the app (port 8080 by default; use another if it is taken):

```
ROADMAP_PORT=8081 docker compose up -d --build
```

An ordinary build takes seconds and has no videos. `RELEASE=1` on the same command runs the tests and
renders the guide videos, which takes many minutes.

### Tests without a full release build

Build the tools image once (browser, test runner, ffmpeg, voice):

```
docker build --target tools -t rb-tools .
```

Regenerate the standalone template, which some tests need, then run the tests against the working copy:

```
docker run --rm -v "$PWD/app:/site" -v "$PWD/assets:/assets:ro" rb-tools sh -c 'node /assets/standalone.mjs /site /site/standalone-template.js'
```

```
docker run --rm -v "$PWD/app:/work/app:ro" -v "$PWD/release/tests:/work/release/tests:ro" -v "$PWD/release/serve.mjs:/work/release/serve.mjs:ro" -v "$PWD/release/playwright.config.mjs:/work/release/playwright.config.mjs:ro" rb-tools sh -c 'npx playwright test'
```

All tests must pass before a commit. Check syntax of a changed script with `node --check` inside either
image.

### Checklist for a change

1. Change `app/`. Keep new settings in `normalise()` with a default.
2. Add or update a test.
3. Update `app/guide.js`, the README and `docs/REQUIREMENTS.md`.
4. If a step in `release/videos.mjs` or `film/scenes.mjs` names something that moved or was removed,
   fix the step so the next recording does not fail. In `film/scenes.mjs` each scene needs exactly one
   line per card and per step.
5. Run the tests. Look at the change in a browser, in View and Edit, light and dark.
6. Commit with a message that says what a user will notice. Push only when asked.

### Conventions

- Plain English in the interface: no jargon, sentence case, British spelling.
- Controls sit on the thing they change; panels hold the rest. See `docs/DESIGN-LANGUAGE.md`.
- No Save button. Every change is kept as it is made and can be undone.
- Hidden items stay visible but dimmed in Edit, and vanish from View and from exports.
- Animation is smooth and is switched off when the computer asks for reduced motion.

## 4. Integration

### Build and delivery

| What you want | Command or trigger | Result |
|---|---|---|
| The app locally | `docker compose up -d --build` | nginx container on port 8080 |
| Tests, guide videos, site and zip | `docker buildx build --build-arg RELEASE=1 --target dist --output type=local,dest=dist .` | `dist/site/` and `dist/roadmap-builder.zip` |
| The product film | `docker compose -f film/compose.yml run --rm film` | `film/out/` (4K, 1080p, subtitles, chapters, report) |
| The hosted site | `./publish-pages.sh` (`BUILD=0` to publish `dist/site` as it is, `FILM=1` to record the film first) | One commit that replaces the `gh-pages` branch |
| A release package on your machine | `./package-release.sh vX.Y.Z` | `dist/release-vX.Y.Z/` |
| A GitHub release | Push a tag `vX.Y.Z` | The pipeline builds, records, packages and creates the release |

Notes:

- **Stale files.** Exporting to `dist/` adds and replaces files but does not delete ones that no longer
  exist. After removing a file from `app/`, delete it from `dist/site/` before `BUILD=0 ./publish-pages.sh`.
- **Pages.** Published from the `gh-pages` branch, by hand, so nothing goes live until the script is
  run. GitHub refuses files over 100 MB, so the site carries the film's 1080p copy only.
- **Releases.** Write `docs/releases/vX.Y.Z.md` first; the pipeline uses it as the release text. A run
  takes one to two hours on GitHub's machines. The workflow can also be started by hand from the Actions
  tab. Pushing to `main` alone starts nothing.
- **Versions.** Tags are `vMAJOR.MINOR.PATCH`. A tag is never moved; a fix gets a new patch number.
  The app shows its version at the end of the toolbar. It comes from `VERSION` at the top of
  `app/app.js`: change it in the commit that prepares a release. The pipeline's first step stops a
  tagged run if the tag and `VERSION` differ.
- **Internet.** Every build needs it (npm, base images; a release build also the browser image and the
  voice model). The running app needs none.

### Hosting it somewhere else

`dist/site/` is a folder of static files and can be served by any web server or opened straight from a
folder. If you serve it yourself:

- send the content security policy from `nginx.conf`, or a stricter one;
- serve `.webmanifest` as `application/manifest+json` and `.vtt` as `text/vtt`;
- the policy sets `frame-ancestors 'self'`, so the app cannot be put in a frame on another site unless
  you change that line on purpose;
- the offline helper (`sw.js`) is only registered over http or https, not from a folder.

### Getting data in and out

There is no server and no API. A roadmap moves as a file.

| Direction | Format | How |
|---|---|---|
| In | Roadmap file `.json` | Import, or drop the file on the page. Any earlier version is accepted |
| In | `.csv` with `Name` and `Start` columns (optional `Type`, `Workstream`, `End`) | Import, or drop the file |
| Out | `.json`, `.csv`, `.png`, PDF | The Export menu |
| Out | Standalone page `.html` (editable, or view only) | The Export menu. One file holding the app and the roadmap |

To produce roadmaps from another system (a planning tool, a spreadsheet, a script), write either format
and import it. The quickest way to learn the `.json` shape is to export the sample roadmap; the JSON
editor in the app shows the compact form of the same thing, one item per line.

To publish a roadmap for readers, export the view-only standalone page and host that single file
anywhere, or attach it to an email. It needs no server and loads nothing from the network.

### Hooks for scripts and tests

The page exposes one small object for automation:

```js
window.__roadmap.state                    // the current roadmap (read it; do not change it in place)
window.__roadmap.importText(name, text)   // import a .json or .csv given as text; the name decides the format
window.__roadmap.toCSV()                  // the activity list as CSV text
```

The tests use these. A standalone page carries its roadmap in a `<script id="roadmap-data"
type="application/json">` block, which is how one file can hold both the app and the data.

### What is not there yet

No accounts, no shared editing, no live link to Jira or similar tools, and no dependencies between
activities. The planned desktop and hosted editions are described in `docs/IDEAS.md`.
