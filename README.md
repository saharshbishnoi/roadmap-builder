# Roadmap Builder

**Try it in your browser: <https://saharshbishnoi.github.io/roadmap-builder/>** (nothing to install; your roadmap stays in your browser).

An intuitive, interactive roadmap view: collapsible workstreams on the left, a
month-scaled timeline on the right, a critical path and key milestones across the top, floating
cards over the chart, editing controls on the elements themselves, and a resizable panel of cards,
a guide, a features list and a JSON live editor on the right. It runs entirely in the browser and is served
as static files from one small nginx container.

## Run it

```
docker compose up -d --build
```

Open http://localhost:8080. To stop and remove the container:

```
docker compose down
```

To use another port: `ROADMAP_PORT=9000 docker compose up -d --build`.

### Release build

```
RELEASE=1 docker compose up -d --build
```

The same command with `RELEASE=1` also:

1. runs every browser test in `release/tests` (Playwright, headless Chromium); the build stops if one fails;
2. renders the guide videos from the app as it is now: five chapters, each in a light and a dark
   version, in 4K (3840 x 2160). It drives the real app, renders it frame by frame, narrates each
   scene with a natural female voice and writes subtitles and poster images.

Without `RELEASE=1` the Guide tab shows the steps and says how to make the videos. A release build
takes several minutes and its tooling is large (a browser image and a speech model, about 2.5 GB,
cached by Docker after the first time); none of it ends up in the final image except the videos.

### Publishing: GitHub Pages and the zip

**The site** is published from a branch, by hand, so nothing goes live until you say so:

```
./publish-pages.sh
```

That runs the release build in Docker, adds the product film if `film/out` has one, and pushes the
finished site to the `gh-pages` branch as a single commit that replaces the previous one. So `main`
stays free of binaries and the branch never grows. Options: `FILM=1` re-records the film first,
`BUILD=0` publishes the `dist/site` folder that is already there.

One-time setup on GitHub: Settings, Pages, Source "Deploy from a branch", branch `gh-pages`, folder
`/ (root)`. GitHub Pages on a private repository needs a paid GitHub plan, and a Pages site is public
either way. To take the site down, delete the branch or switch Pages off.

The hosted site can be shared as a link and installed from the browser (Install, in the address bar
of Chrome or Edge) to run in its own window, offline. It is also the only place the **product film**
appears (a five-minute narrated tour, see `film/README.md`), behind a "Watch the tour" bar. GitHub
refuses files over 100 MB, so the site plays the film's 1080p copy; the 4K master stays in `film/out`.

**Releases** are made by the pipeline: pushing a version tag (for example `v1.4.1`) runs
`.github/workflows/release.yml`, which does the release build, records the product film, and creates
the GitHub Release with everything attached: `roadmap-builder.zip` (the whole app with its guide
videos; unzip it and open `index.html`, no server needed), the film in 4K and 1080p with its
subtitles and chapter list, the guide videos on their own, and checksums. The release text comes
from `docs/releases/<tag>.md` when that file exists. The newest zip is always at
`https://github.com/saharshbishnoi/roadmap-builder/releases/latest/download/roadmap-builder.zip`.
On GitHub's machines a run takes about an hour and a quarter.

**The same package** can be gathered on your own machine by `./package-release.sh v1.3.0`
into `dist/release-v1.3.0/`: the zip, the guide videos on their own, the product film (4K and 1080p),
its subtitles and chapter list, checksums, and the notes from `docs/releases/`. `BUILD=1` runs the
release build first and `FILM=1` re-records the film.

To make the same site folder and zip on your own machine without publishing:

```
docker buildx build --build-arg RELEASE=1 --target dist --output type=local,dest=dist .
```

Publishing shares the app, not your roadmaps: each person's roadmap stays in their own browser.
To pass a roadmap to someone, export the roadmap file and send it.

### Nothing binary is kept in git

Everything that is not source is produced by the Docker build:

| What | Where it comes from |
|---|---|
| Libraries in `app/vendor` and fonts in `app/fonts` | fetched from npm by the `assets` stage of every build; versions locked in `assets/package-lock.json` |
| Guide videos, subtitles and posters in `app/guide` | rendered by a release build |
| The product film in `film/out` | recorded by `docker compose -f film/compose.yml run --rm film` |
| App icons (PNG), the offline file list and the zip | made by the `site` stage of every build |
| Narration voice | Kokoro text-to-speech (Apache 2.0 licence), model files pinned by checksum in the `Dockerfile` |

So every build needs internet access (npm, the nginx image; a release build also the Playwright
image, ffmpeg and the voice model). Nothing is fetched at runtime.

What is said and shown in each video is in `release/videos.mjs`; the steps under each video are in
`app/guide.js`. Change both whenever the app changes.

## Using it

The schedule fills the window and scrolls on its own. A floating toolbar sits above it; two
full-height panels open beside it: Properties on the right (both modes) and the JSON editor on the
left (Edit mode). Help opens in its own window, with the steps for each part of the app and, after a
release build, a short narrated video for each. The list of requirements is in
[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

**View mode** is for reading and presenting. Hover over a bar, milestone or critical path stage to
see its hover card; click it to open its dialog card. Collapse a workstream with its arrow. Drag the
year scale to squeeze or stretch the timeline; double-click it to fit the window. Right-click a row and
choose "Fit the timeline to this row" to scale and scroll the timeline so that row fills the middle
80% of the screen.

**Edit mode** keeps the quick edits on the roadmap itself and everything else in Properties:

- Type straight into a workstream or activity name, a start or end date, a card title, or a lane or
  column heading. There is no Save button. Each burst of typing is one Undo step.
- Each row and card has a colour square, an eye to hide or show it, a pencil and (where it applies)
  a cross to delete. Hidden things stay dimmed in Edit mode and disappear in View mode and exports.
- The pencil, or a click on a bar, milestone or stage, opens all of that item's settings at the top
  of the Properties panel, including its two Markdown cards: hover and click.
- Type a name in the highlighted "Add an activity" row at the end of a workstream and press Enter
  to add a row; the last row adds a workstream. New rows have no dates: type them, or click on the
  row's timeline to place it. A bar with only one date fades towards the open side.
- The chips above the table choose what is written beside each bar: Activity, Start, End. The eyes
  in the chart header show or hide the critical path, the milestone lines and the date columns.
- Drag a bar to move it and drag either end to resize it. Bars snap to whole months. Drag the
  dotted handle to reorder rows or move a row to another workstream.
- Right-click a row, bar, milestone, stage, card or the empty timeline for a menu that fits what
  is under the pointer.
- **Floating cards** can be pinned to the row they sit on (the pin on the card). A pinned card moves
  with its row, so it is still in the right place when rows are hidden in View mode. Unpinned, it
  stays a fixed distance from the top.

**Properties panel** (right): the selected item, Add (workstream, key milestone, critical path
stage, floating card, panel card), Text (fonts, text size, and separate sizes for labels and for
dates), Display (theme, floating cards, rounded cards, 3D effect), Header (size and font of the
heading, its colours, the name of the Cards tab, and the date chip), Timeline (start year, years
shown, today line colour) and, on its Cards tab, the panel cards.

**Colour ideas.** Under Display, Randomise colours gives the header, the highlight and every
workstream a fresh, matched set of colours built around one random hue, chosen to read on both
themes. Press it again for another idea, use Light / dark to check each one, and Undo to go back.

**Header.** A slim bar with a short heading and a small tagline, both typed in place in Edit mode.
The date chip sits on the right; it can be switched off, or kept on screen but left out of exports,
where it reads "As at" the day of the export. Drag its edge to resize it.

**JSON editor** (left, Edit mode): one line per activity and per card; change a name, a date or a
card's text and the chart follows. Copy a line to add one, delete a line to remove one. Switch Show to Whole roadmap
to edit the complete file. Lines are numbered and a mistake is reported with its line. Ctrl+S,
the Format button, or leaving the editor applies the text and lays it out again, one item per line.

## Files in and out

| Export | What it holds |
|---|---|
| Roadmap file (.json) | Everything: content, Markdown cards, colours, fonts, positions and display settings |
| Standalone page (.html) | The app and this roadmap in one file that opens with a double-click; the recipient can edit their copy |
| Standalone page, view only (.html) | The same single file, locked to View mode, opening exactly as the roadmap looks at export: zoom, place on the timeline, collapsed workstreams, theme and panel |
| Activity list (.csv) | Activities, milestones and critical path stages, for a spreadsheet |
| Image of this view (.png) | The timeline as it is on screen: same zoom, starting where it is scrolled to, every row |
| Image, whole timeline (.png) | The whole roadmap at full width |
| PDF, A3 landscape | The roadmap fitted to one A3 page |
| PDF, exact size | One page the same size as the roadmap |

Import takes a `.json` roadmap file or a `.csv` with `Name` and `Start` columns (optional `Type`,
`Workstream`, `End`). You can also drop a file onto the page. Importing replaces the current
roadmap; Undo brings the previous one back.

## Where the data lives

There is no database and no server-side state. Each browser keeps its own working copy in local
storage, so two people opening the same URL see their own copies. The exported `.json` file is the
record to keep, share and put under version control. `docker compose down` does not delete anything
held in a browser.

## Layout

```
docker-compose.yml   one service, port 8080 by default
Dockerfile           nginx + the app folder
nginx.conf           static hosting and a content security policy
app/index.html       page shell
app/styles.css       layout, themes, fonts, 3D card effect
app/app.js           all behaviour
app/guide.js         the steps shown on the Help page (edit them here)
app/help.html, app/help.js   the Help page, opened in its own window
app/sw.js            offline support for the installed web app
app/manifest.webmanifest, app/icon.svg   what makes the app installable
app/guide/           guide videos, subtitles and posters: made by a release build, not in git
docs/                requirements, ideas, planned editions and the design language
.github/workflows/   the pipeline that builds a tagged release and attaches the zip, film and videos
publish-pages.sh     builds the site and pushes it to the gh-pages branch for GitHub Pages
package-release.sh   gathers the zip, guide videos, film and notes for a release into dist/
film/                the product film: scenes, recorder and its own container (see film/README.md)
release/             tests, the video builder and the narration script, used only by a release build
app/vendor/          marked, DOMPurify, html-to-image, jsPDF: fetched by the build (see THIRD-PARTY.txt)
assets/              the list of libraries and fonts the build fetches
app/fonts/           sans-serif fonts (SIL Open Font License): fetched by the build
```
