# Roadmap Builder

A single-page roadmap app in the style of a BigPicture Gantt: collapsible workstreams on the left, a
month-scaled timeline on the right, a critical path and key milestones across the top, floating
cards over the chart, a live editor on the left and a resizable panel of cards, guide clips and
requirements on the right. It runs entirely in the browser and is served
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

The image is built from `nginx:1.27-alpine`, so the first build needs access to a registry that has
that image. Nothing is fetched at runtime: the libraries and fonts are in `app/vendor` and `app/fonts`.

## Using it

The Guide tab in the right-hand panel has seven short clips that show each of these steps, and the
Requirements tab lists what the app was asked to do and where to find it.

**View mode** is for reading and presenting. Hover over a bar, milestone or critical path stage to
see its hover card; click it to open its dialog card. Collapse a workstream with its arrow.

**Edit mode** docks a live editor on the left:

- Click a bar, milestone, stage, workstream or card and edit it under Selected item. The roadmap
  updates as you type; there is no Save button. Each burst of typing is one Undo step.
- Each bar, milestone and stage has two Markdown cards: one shown on hover and one shown on click.
- The Roadmap tab holds the title, timeline, banner and line colours, and custom font names.
- The Source tab is the whole roadmap as JSON and is also live.
- Drag a bar to move it and drag either end to resize it. Bars snap to whole months.
- Drag the dotted handle to reorder rows or move a row to another workstream.
- Add menu: workstream, key milestone, critical path stage, floating card, panel card.

**Visualisation menu** (both modes): show or hide the critical path, milestone lines, today line,
date labels, floating cards, right panel and 3D card effect; light or dark theme; heading font, text
font, text size and capitals. Barlow, Barlow Condensed, Inter, IBM Plex Sans and Source Sans 3 are
bundled. Arial, Segoe UI, Verdana, Calibri and the system font are used if the computer has them.

**Panels.** Drag the divider beside the live editor or the right panel to change its width, or focus
the divider and use the arrow keys. Double-click it to reset.

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
app/guide.js         text for the Guide and Requirements tabs (edit it here)
app/guide/           the guide clips (MP4, no sound) and their poster images
app/vendor/          marked, DOMPurify, html-to-image, jsPDF (see THIRD-PARTY.txt)
app/fonts/           bundled sans-serif fonts (SIL Open Font License)
```
