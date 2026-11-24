# Roadmap Builder

**Try it in your browser: <https://saharshbishnoi.github.io/roadmap-builder/>** (nothing to install; your roadmap stays in your browser).

| Light | Dark |
|---|---|
| [![Roadmap Builder in the light theme](https://saharshbishnoi.github.io/roadmap-builder/guide/01-read-light.jpg)](https://saharshbishnoi.github.io/roadmap-builder/guide/01-read-light.jpg) | [![Roadmap Builder in the dark theme](https://saharshbishnoi.github.io/roadmap-builder/guide/01-read-dark.jpg)](https://saharshbishnoi.github.io/roadmap-builder/guide/01-read-dark.jpg) |

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

**Releases** are made by the pipeline: pushing a version tag (for example `v1.4.4`) runs
`.github/workflows/release.yml`, which does the release build, records the product film, makes the
quality report, and creates the GitHub Release with everything attached: `roadmap-builder.zip` (the
whole app with its guide videos; unzip it and open `index.html`, no server needed), the film in 4K
and 1080p with its subtitles and chapter list, the guide videos on their own,
`roadmap-builder-quality-report.zip`, and checksums. If the quality report fails, the release goes
out without it. The release text comes
from `docs/releases/<tag>.md` when that file exists. The newest zip is always at
`https://github.com/saharshbishnoi/roadmap-builder/releases/latest/download/roadmap-builder.zip`.
On GitHub's machines a run takes about an hour and a quarter.

**The same package** can be gathered on your own machine by `./package-release.sh v1.4.4`
into `dist/release-v1.4.4/`: the zip, the guide videos on their own, the product film (4K and 1080p),
its subtitles and chapter list, checksums, and the notes from `docs/releases/` (the quality report is
made separately, below). `BUILD=1` runs the
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

### Quality report

```
./quality/run.sh
```

Makes one page of figures in `dist/quality/index.html`: known vulnerabilities (CVEs) with an inventory
of what is packaged, static analysis of the JavaScript, CSS, HTML, shell scripts, Dockerfiles and
Python, and how much of the app the browser tests run. It reports only: a finding never fails a build
or a release. Everything it needs is in `quality/`; see [quality/README.md](quality/README.md).

### Changing the app

[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) has the ground rules, where things are, how to check a
change and how to connect the app to other things. [docs/TESTING.md](docs/TESTING.md) covers the
browser tests: how to run them, how to add one, and what is not tested yet. Release notes for each
version are in [docs/releases/](docs/releases/).

## Using it

The schedule fills the window and scrolls on its own. A floating toolbar sits above it; two
full-height panels open beside it: Properties on the right (both modes) and the JSON editor on the
left (Edit mode). The Guide button, at the end of the toolbar, opens a large dialog with the steps for each part of the app and, after a
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
- Every eye stays in the same place: solid when the thing is shown, a faint outline when it is hidden.
  A hidden date column or a switched-off set of floating cards keeps its place in Edit mode, dimmed,
  so nothing moves and nothing is out of reach.
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
- **Levels.** Activities can be nested inside a workstream, up to four levels deep. Click in a
  name and press Ctrl+] to put the row under the row above it, Ctrl+[ to move it back up; Indent
  and Outdent are also on the pencil's settings and in the right-click menu. A row moves with
  the rows beneath it, when indented and when dragged. A row with rows beneath it is a parent:
  its small arrow folds them away (in View mode too), and it shows a bracket and dates worked
  out from the rows beneath it rather than dates of its own. In the roadmap file each activity
  has a `level`; a row belongs to the nearest row above it with a lower level. The CSV activity
  list does not carry levels.
- **Dependencies.** Point at a bar and drag from the dot at its end to the row that has to wait
  for it; a line with an arrow joins the two. With one bar selected, right-clicking another also
  offers "Depends on". Lines are quiet: they show for the bar under the pointer and for the
  selected bar, in both modes, and the Links eye above the table (or "Show all dependency lines"
  under Display) shows them all. A line turns red and dashed when an activity starts before the
  one it waits for has ended; in Edit mode such lines are always on show. Nothing is moved for
  you: the lines only warn. A link that would go round in a circle is refused. Remove a link from
  the right-click menu of either activity. In the roadmap file each activity lists what it waits
  for in `deps`.
- **Floating cards** can be pinned to the row they sit on (the pin on the card). A pinned card moves
  with its row, so it is still in the right place when rows are hidden in View mode. Unpinned, it
  stays a fixed distance from the top.

**Properties panel** (right): the selected item, Add (workstream, key milestone, critical path
stage, floating card, panel card), Text (fonts, text size, and separate sizes for labels and for
dates), Display (theme, row height, bar thickness, dependency lines, floating cards, rounded cards, 3D effect), Header (style, size and font of the
heading, its colours, the name of the Cards tab, and the date chip), Timeline (start year, years
shown, today line colour) and, on its Cards tab, the panel cards.

**Row height.** Under Display, Row height sets how tall every row is: Compact, Standard, Comfortable,
Tall or Extra tall. Bar thickness sets how much of the row the bar fills: Thin, Standard or Thick.
Compact fits more rows in the same space; Tall with Thick bars gives a simple view of a few rows.
Floating cards keep their place against the rows. Any height from 22 to 72 pixels (`rowH`) and any
thickness from 30 to 90 percent (`barFill`) can be typed in the JSON editor, under Whole roadmap.

**Presenting with the pointer.** The target on the toolbar, beside Today, switches pointer tracking
on (also in the right-click menu and in Commands). The pointer then steers the view. The middle of
the chart is a rest zone. Towards any edge the timeline glides that way, faster the closer the
pointer gets, and eases to a stop when the pointer comes back; a soft glow shows which edge is
pulling. The scroll wheel zooms the timeline smoothly around the pointer. A click on a row folds its
workstream away or opens it again; a click on a bar or milestone still shows its details. Esc, the
target again, or Stop tracking the pointer in the right-click menu ends it. It works in View mode;
switching to Edit ends it, and nothing about it is saved.

**Slides.** A slide is a saved view of the roadmap: the zoom, the place on the timeline, the row at
the top and which workstreams are folded, with a title and an optional description. Slides are made
in Edit mode only, on the Slides tab of the right panel: set the roadmap up, then "Save this view as
a slide". Each slide is a card that can be renamed in place, reordered, shown, pointed at the view
now on screen ("Use this view") or deleted. "Glide between slides" sets how many seconds a change
takes, from no glide to five seconds.

**Presenting.** The screen on the toolbar, Present on the Slides tab, or Commands starts it at the
first slide. The roadmap glides smoothly from one saved view to the next: right arrow, Space or
Enter goes forward, left arrow goes back, Home and End go to the ends, and a click on a slide's card
goes straight to it. A very thin bar across the top of the window has one piece per slide, and a
fill that glides along it in step with the roadmap, taking the same number of seconds: the filled
part is done and on show, the faint part is left. A small tag at the bottom
left shows the count and title with back and forward buttons. Esc, the screen again, or Stop
presenting in the right-click menu ends it. A slide stores months, not pixels, so it shows the same
stretch of the timeline on any screen. Slides are kept in the roadmap file, so a standalone page,
including a view-only one, can be presented too. Folding done by a slide stays as it is afterwards.

**Commands.** Ctrl+K (Cmd+K on a Mac) or Ctrl+Space, or the Ctrl K button on the toolbar, opens a
search box over everything the app can do, in groups: View, Add, Edit, Show or hide, Files and Help.
Type a few letters, move with the arrow keys and press Enter. Switches say whether they are Shown
or Hidden, and a command that changes the roadmap says it switches to Edit. Typing also finds the
less common settings (row height, bar thickness, header style) and the workstreams, activities,
milestones, stages and floating cards on the roadmap; choosing one brings it into view and opens
it. Esc, or the same keys, closes the box.

**Version.** The version of the app is shown at the end of the toolbar, beside Guide. It is set in
`app/app.js` (`VERSION`); the release pipeline refuses a tag that does not match it.

**Fonts.** Open Sans is used for headings and text to begin with, without letter-spacing. Barlow,
Barlow Condensed, Inter, IBM Plex Sans and Source Sans 3 come with the app too. A roadmap saved by
an earlier version that still used the old default, Barlow, opens in Open Sans; choose Barlow under
Text to go back.

**Colour ideas.** Under Display, Randomise colours gives the header, the highlight and every
workstream a fresh, matched set of colours built around one random hue, chosen to read on both
themes. Press it again for another idea, use Light / dark to check each one, and Undo to go back.

**Header.** One slim line, 28 pixels tall with square corners, holding a short heading and a small
tagline, both typed in place in Edit mode. Style, under Header in Properties, chooses its look:
Label tab (the heading on a block of the header colour, with a thin rule), Solid strip, Glass strip,
Underline, Two-tone, or Classic (the taller bar with the tagline under the heading).
The date chip sits on the right; it can be switched off, or kept on screen but left out of exports,
where it reads "As at" the day of the export. Drag its edge to resize it.

**JSON editor** (left, Edit mode): one line per activity and per card; change a name, a date or a
card's text and the chart follows. Copy a line to add one, delete a line to remove one. Switch Show to Whole roadmap
to edit the complete file. Lines are numbered and a mistake is reported with its line. Ctrl+S,
the Format button, or leaving the editor applies the text and lays it out again, one item per line.

## Templates

Templates, on the toolbar beside Import, starts from a ready-made roadmap. Dates are counted from
January of the current year, so a template is always current.

| Template | What it shows |
|---|---|
| Simple | A website relaunch: three workstreams, ten activities, two key milestones, a few links |
| Typical | A product launch: five workstreams, one level of nesting, a critical path, links and three slides |
| Complex | A transformation programme: seven workstreams, three levels of nesting, 78 activities, 35 links, floating cards and five slides |
| Sample | Project Wombat, the roadmap the app starts with |

A template replaces the roadmap on screen. Undo brings yours back; export it first if you want
to keep a copy. The templates are also in Commands (Ctrl+K).

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
app/guide.js         the steps shown in the Guide dialog (edit them here)
app/sw.js            offline support for the installed web app
app/manifest.webmanifest, app/icon.svg   what makes the app installable
app/guide/           guide videos, subtitles and posters: made by a release build, not in git
docs/                requirements, ideas and planned editions, design language, development,
                     testing, the brief for the videos, and release notes (docs/releases/)
.github/workflows/   the pipeline that builds a tagged release and attaches the zip, film and videos
publish-pages.sh     builds the site and pushes it to the gh-pages branch for GitHub Pages
package-release.sh   gathers the zip, guide videos, film and notes for a release into dist/
film/                the product film: scenes, recorder and its own container (see film/README.md)
release/             tests, the video builder and the narration script, used only by a release build
quality/             the quality report: vulnerabilities, static analysis and test coverage (see quality/README.md)
desktop/             a Tauri desktop shell: written, never built, not part of any release
app/vendor/          marked, DOMPurify, html-to-image, jsPDF: fetched by the build (see THIRD-PARTY.txt)
assets/              the list of libraries and fonts the build fetches
app/fonts/           sans-serif fonts (SIL Open Font License): fetched by the build
```
