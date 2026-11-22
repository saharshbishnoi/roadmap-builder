# Roadmap Builder

A single-page roadmap app in the style of a BigPicture Gantt: collapsible workstreams on the left, a
month-scaled timeline on the right, a critical path and key milestones across the top, floating
cards over the chart, editing controls on the elements themselves, and a resizable panel of cards,
guide clips, requirements and a JSON live editor on the right. It runs entirely in the browser and is served
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

The Guide tab in the right-hand panel has seven short clips (recorded in an earlier layout; the
steps under each clip are current), and the Requirements tab lists what the app was asked to do and where to find it.

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
- The Add bar adds a workstream, key milestone, critical path stage, floating card or panel card.

**JSON tab** (right panel, Edit mode) is a live editor with one line per activity: change a name or
a date and the chart follows. Copy a line to add an activity, delete a line to remove one. Switch
Show to Whole roadmap to edit the complete file.

**Display bar** (both modes): light or dark theme, heading font, text font, text size, capitals
(off by default), 3D card effect, floating cards and the right panel. Barlow, Barlow Condensed,
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
app/guide.js         text for the Guide and Requirements tabs (edit it here)
app/guide/           the guide clips (MP4, no sound) and their poster images
app/vendor/          marked, DOMPurify, html-to-image, jsPDF (see THIRD-PARTY.txt)
app/fonts/           bundled sans-serif fonts (SIL Open Font License)
```
