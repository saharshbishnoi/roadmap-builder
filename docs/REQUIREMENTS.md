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
| Visibility controls stay where they are | Every eye keeps its place: solid when shown, a faint outline when hidden. In Edit mode a hidden row, date column or set of floating cards stays on screen, dimmed, and can still be changed |
| Rows can be made taller, shorter, thicker or thinner | Properties, Display: Row height (Compact to Extra tall) and Bar thickness (Thin, Standard, Thick) |
| The version in use is visible | At the end of the toolbar, beside Guide |
| Common functions and actions from the keyboard | Ctrl+K or Ctrl+Space, or Ctrl K on the toolbar: a search box over grouped commands (View, Add, Edit, Show or hide, Files, Help), settings and the names on the roadmap |
| A way to present by steering with the pointer | The target on the toolbar: the timeline glides towards the edge the pointer is near, the wheel zooms, a click on a row folds its workstream. Esc or the right-click menu ends it |
| Dependencies between activities, kept light | Edit mode: drag from the dot at the end of a bar to the row that waits for it. Lines show on hover and for the selected bar; the Links eye shows all. A line turns red when the dates clash; nothing is moved automatically |
| Slides made by the presenter, in Edit mode only | The Slides tab of the right panel: Save this view as a slide. Each slide is a card with a title and an optional description; reorder, replace its view, or delete |
| A presentation mode that glides between the saved views, forwards and back, over a set number of seconds | The screen on the toolbar, or Present on the Slides tab. Arrow keys, Space or a click on a card. Glide between slides sets the seconds |
| A very small progress accent while presenting | A thin bar across the top of the window, one piece per slide, with a fill that glides in step with the roadmap: done and left |
| Text that reads naturally, not squeezed | Open Sans for headings and text, with no letter-spacing. Other fonts under Text in Properties |
| A modern header that takes little space, in a choice of looks | Properties, Header, Style: Label tab, Solid strip, Glass strip, Underline, Two-tone (one 28-pixel line, square corners) or Classic |
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
| A guide with narrated, subtitled 4K videos in light and dark | Guide, the last button on the toolbar, opens a large dialog at the top of the window. It plays the videos that match the theme the app is showing. The videos are made by a release build |
| Switch between light and dark from the toolbar | The Dark / Light button beside Guide; the same setting as Theme in Properties |
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
