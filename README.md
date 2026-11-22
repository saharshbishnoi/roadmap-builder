# Roadmap Builder

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

Pushing a version tag (for example `v1.1.0`) runs `.github/workflows/release.yml`, which does the
release build in Docker and then:

- publishes the finished site to **GitHub Pages**, so the app can be shared as a link and installed
  from the browser (Install, in the address bar of Chrome or Edge) to run in its own window, offline;
- attaches **`roadmap-builder.zip`** to the GitHub Release: the whole app with its guide videos.
  Unzip it and open `index.html`; no server is needed. The newest one is always at
  `https://github.com/saharshbishnoi/roadmap-builder/releases/latest/download/roadmap-builder.zip`.

One-time setup: in the repository, Settings, Pages, set Source to "GitHub Actions". GitHub Pages
on a private repository needs a paid GitHub plan, and a Pages site is public either way.

To make the same site folder and zip on your own machine:

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
| App icons (PNG), the offline file list and the zip | made by the `site` stage of every build |
| Narration voice | Kokoro text-to-speech (Apache 2.0 licence), model files pinned by checksum in the `Dockerfile` |

So every build needs internet access (npm, the nginx image; a release build also the Playwright
image, ffmpeg and the voice model). Nothing is fetched at runtime.

What is said and shown in each video is in `release/videos.mjs`; the steps under each video are in
`app/guide.js`. Change both whenever the app changes.

## Using it

The Guide tab in the right-hand panel has five short narrated videos with subtitles and the steps for
each,
and the Features tab lists what the app does and where to find it.

**View mode** is for reading and presenting. Hover over a bar, milestone or critical path stage to
see its hover card; click it to open its dialog card. Collapse a workstream with its arrow.

**Edit mode** puts every control on the element it changes. There are no menus or side editors:

- Type straight into a workstream or activity name, a start or end date, a card title, or a lane or
  column heading. There is no Save button. Each burst of typing is one Undo step.
- Each row and card has a colour square, an eye to hide or show it, a pencil and (where it applies)
  a cross to delete. Hidden things stay dimmed in Edit mode and disappear in View mode and exports.
- The pencil, or a click on a bar, milestone or stage, opens all of that item's settings directly
  under it (inside the card, for cards), including its two Markdown cards: hover and click.
- The eyes in the chart header show or hide the critical path, the milestone lines, the Start and
  End columns, and the activity name, start date and end date beside each bar.
- The start year, number of years, banner colours and today line are edited in the banner.
- Drag a bar to move it and drag either end to resize it. Bars snap to whole months.
- Drag the dotted handle to reorder rows or move a row to another workstream.
- Type a name in the highlighted "Add an activity" row at the end of a workstream and press Enter
  to add a row; the last row adds a workstream. New rows have no dates: type them, or click on the
  row's timeline to place it. A bar with only one date fades towards the open side.
- The chips above the table choose what is written beside each bar: Activity, Start, End.
- Drag the right edge of the Workstream / activity heading to resize that column (both modes).
- Right-click a row, bar, milestone, stage, card or the empty timeline for a menu that fits what
  is under the pointer. A faint line follows the pointer across the timeline and shows its date.
- The Add bar also adds a workstream, key milestone, critical path stage, floating card or panel card.

**JSON tab** (right panel, Edit mode) is a live editor with one line per activity: change a name or
a date and the chart follows. Copy a line to add an activity, delete a line to remove one. Switch
Show to Whole roadmap to edit the complete file.

**Display bar** (both modes): light or dark theme, heading font, text font, text size, capitals
(off by default), 3D card effect, rounded or square cards, floating cards and the right panel. Barlow, Barlow Condensed,
Inter, IBM Plex Sans and Source Sans 3 are bundled. Arial, Segoe UI, Verdana, Calibri and the system
font are used if the computer has them.

**Panel.** Drag the divider beside the right panel to change its width, or focus the divider and use
the arrow keys. Double-click it to reset.

## Files in and out

| Export | What it holds |
|---|---|
| Roadmap file (.json) | Everything: content, Markdown cards, colours, fonts, positions and display settings |
| Activity list (.csv) | Activities, milestones and critical path stages, for a spreadsheet |
| Image (.png) | The whole roadmap at full width |
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
app/guide.js         text for the Guide and Features tabs (edit it here)
app/sw.js            offline support for the installed web app
app/manifest.webmanifest, app/icon.svg   what makes the app installable
app/guide/           guide videos, subtitles and posters: made by a release build, not in git
docs/                ideas, planned editions and the design language
.github/workflows/   the pipeline that publishes to GitHub Pages and attaches the zip to a release
release/             tests, the video builder and the narration script, used only by a release build
app/vendor/          marked, DOMPurify, html-to-image, jsPDF: fetched by the build (see THIRD-PARTY.txt)
assets/              the list of libraries and fonts the build fetches
app/fonts/           sans-serif fonts (SIL Open Font License): fetched by the build
```
