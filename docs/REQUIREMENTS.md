# Roadmap Builder: requirements

What the app is required to do, and where each thing is found. This list used to be the Features tab inside the app; it now lives here.

## The roadmap

| Requirement | Where it is |
|---|---|
| Intuitive interactive view | Collapsible workstreams with summary bars beside a month-scaled timeline |
| Placeholder content is nonsense, with no real programme wording | Load sample roadmap, in the Add bar in Edit mode |
| Today's date is shown | Date chip in the banner and a dashed today line |
| Key milestones across the top, each with its own colour | Key milestones lane |
| Each milestone's vertical line can be shown or hidden | Click the milestone in Edit mode, Vertical line |
| Top-level critical path with its own dates | Critical path lane; edit stages in Edit mode |
| Critical path can be shown or hidden in View mode | Eye beside Critical path, in Edit mode |

## Interaction

| Requirement | Where it is |
|---|---|
| View mode for reading and Edit mode for changing | View / Edit switch in the toolbar |
| Hover cards and click dialog cards on items | Hover or click any bar, milestone or stage |
| Card content is written in Markdown | Pencil on any item, with a preview under each box |
| Editing happens on the elements, not in menus or side panels | Edit mode: inline names, dates, headings, colours and eye icons; full settings open under the item |
| JSON live editor for dates and activities | JSON tab of the right panel, in Edit mode |
| Start and end dates as columns and beside the bars | Eyes on the Start and End headings; chips above the table for Activity, Start and End beside the bars |
| Add rows by typing, like a list | Add an activity row at the end of each workstream, and Add a workstream at the bottom |
| Dates are optional | A bar with one date fades towards the open side; a row with none can be placed with a click |
| Right-click menu that fits what is under the pointer | Right-click a row, bar, milestone, stage, card or the empty timeline, in either mode |
| Resizable activity column | Drag the right edge of the Workstream / activity heading |
| Hover cards can be moved | Drag a hover card to place it; Reset position puts it back beside the pointer |
| Cards can be created and placed on top of the chart | + Floating card; drag to position |
| Cards have a 3D floating effect, including the right panel | Floating cards and the Cards tab; switch off with 3D cards in the Display bar |
| Square or rounded cards | Rounded cards in the Display bar: floating, panel, hover and dialog cards |

## Appearance

| Requirement | Where it is |
|---|---|
| Every colour can be changed in Edit mode, milestones included | Colour squares on rows and cards; banner, text and today line colours in the banner; Highlight in the Display bar |
| Light and dark mode | Display bar, Theme |
| Sans-serif fonts that can be changed | Display bar: heading font, text font, text size, capitals (off by default). Custom installed fonts beside each font list in Edit mode |

## Files and release

| Requirement | Where it is |
|---|---|
| Everything can be exported to and imported from files | Export, Roadmap file (.json); Import |
| Export an image or a PDF for the final release | Export: PNG, PDF A3 landscape, PDF exact size |
| Runs in a container with compose up and compose down | docker-compose.yml, Dockerfile and nginx.conf in the project |
| A product film on the hosted site | Watch the tour, at the top of the page and in the toolbar. Shown only where the film is published |
| Installable, and works offline | Install from the address bar in Chrome or Edge; the app and the guide videos you have opened are kept for offline use |
| Export a single standalone page | Export, Standalone page (.html): the app and the current roadmap in one file that opens with a double-click |
| One zip with everything | Attached to each release: unzip and open index.html, no server needed |
| One build command, with a release flag | RELEASE=1 docker compose up -d --build also runs every test and renders the guide videos |

## Help

| Requirement | Where it is |
|---|---|
| A features list and a guide with narrated, subtitled 4K videos in light and dark | This panel: Guide and Features tabs. The videos are made by a release build |
| A faint line follows the pointer across the timeline | Move the pointer over the chart; the date under it is shown at the top |
| Smooth animation | Bars, cards and panels glide to their new place; switched off if the computer asks for reduced motion |
| The right panel is adjustable | Drag the divider on its left edge, or focus it and use the arrow keys |

## To run it

| Needed | Why |
|---|---|
| Docker Engine with the Compose plugin (docker compose v2) | To build and run the container |
| Internet access while building | Every build fetches the web server image, the libraries and the fonts. A release build (RELEASE=1) also fetches its test and video tools |
| A current desktop browser | Tested in Chrome. Edge uses the same engine. Firefox and Safari have not been tested |
| No internet connection at runtime | Libraries, fonts and guide videos are served from the container |
