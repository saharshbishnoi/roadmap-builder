# Roadmap Builder: ideas and editions

A working list of where Roadmap Builder could go next. Nothing here is built unless it says so.
The look and behaviour every edition should share is in [DESIGN-LANGUAGE.md](DESIGN-LANGUAGE.md).

## Three editions

| | Browser build | App build | SaaS build |
|---|---|---|---|
| **Status** | Built. This repository. | Planned | Planned |
| **What it is** | A static web page served from one small container | A desktop app for one person or a shared folder | A hosted service for teams |
| **Where roadmaps live** | The browser's own storage, plus files you export and import | Files in a workspace folder on the computer | A database on the server |
| **Version control** | Undo for the current session only | Built in: every save is a version in a local repository | Built in: full history kept by the server |
| **Working together** | Send someone the exported file | Share the workspace folder (or its repository) | Live, in the same roadmap at the same time |
| **Needs** | Any current desktop browser | Windows, macOS or Linux | A browser and an account |

All three should be the same product: the same screen, the same design language, the same roadmap
file format. They differ only in where the roadmap is kept and who else can see it.

### Browser build (today)

What exists now: view and edit modes, editing on the elements, the JSON live editor, import and
export (JSON, CSV, PNG, PDF), light and dark themes, the guide and its videos. No server state.

The browser build can already be shared as a link (GitHub Pages), installed from the browser to run
offline in its own window, and downloaded as one zip that opens from a folder.

### App build: local workspace with files and version control

The same roadmap screen inside a desktop window, with a workspace beside it.

- **Workspace folder.** Choose a folder; every roadmap in it is one `.roadmap.json` file. A file
  list in the app creates, renames, duplicates and deletes roadmaps. No import or export step for
  day-to-day work; the file on disk is the roadmap.
- **Built-in version control.** The workspace is a local Git repository the app manages itself;
  the person never has to know Git.
  - Every save is a version, with an automatic summary of what changed ("moved 3 activities, added
    1 milestone") that can be edited.
  - A history list per roadmap: open any version read-only, compare two versions on the chart
    (old bars shown faintly behind new ones), restore a version.
  - Named versions ("Board pack, March") and scenarios (a branch of the plan to try an alternative,
    kept or discarded later).
  - Because it is ordinary Git underneath, a team can push the workspace to their own Git host.
- **Works offline.** No account and no network.
- **Files in, files out.** Open a `.json` or `.csv` by double-clicking it; export image and PDF
  straight to the folder.
- **How to build it.** Wrap the existing web app in a small desktop shell (Tauri is the lighter
  option; Electron the more common one), with a Git library in the app so nothing has to be
  installed. Built by the same Docker command with an edition flag, producing installers.

### SaaS build: database and collaboration

Everything in the app build, with the workspace on a server and other people in it.

- **Accounts and workspaces.** Sign in, belong to one or more organisations, each with workspaces
  of roadmaps. Roles: owner, editor, commenter, viewer. Single sign-on for organisations.
- **Database backend.** Roadmaps, versions, comments and people stored in a relational database
  (PostgreSQL). The roadmap file format stays the import and export format, so nothing is locked in.
- **Live collaboration.**
  - Several people editing the same roadmap at once, changes appearing as they happen.
  - Presence: who is here, a coloured pointer and a highlight on the item each person is editing.
  - Comments and mentions on any bar, milestone or card; resolve when done.
  - Share a link with view, comment or edit rights; optional public read-only link.
- **Version history on the server.** The same history, compare, restore, named versions and
  scenarios as the app build, plus who made each change.
- **Notifications.** Email or chat message when something you follow moves or is commented on.
- **Admin and trust.** Audit log, data export, retention settings, backups, regional hosting.
- **Integrations.** An API and webhooks; import from and sync with issue trackers and spreadsheets.
- **How to build it.** A small API and a real-time channel in front of the database; a shared-data
  model that merges simultaneous edits without conflicts (a CRDT such as Yjs is the usual choice).
  Delivered as containers from the same compose file.

### What has to change first (all editions)

The browser build keeps everything in one script that reads and writes the browser's storage
directly. Before a second edition is started:

1. **Separate the roadmap from where it is stored.** One storage interface (list, open, save,
   history, restore) with three implementations: browser storage, workspace folder with Git, server.
2. **Split the single script into modules** (data model, drawing, editing, files, guide) so each
   edition can add its own shell around a shared core.
3. **Describe changes as small operations** ("move activity a3 to March") rather than replacing
   the whole roadmap. Version summaries, compare, live collaboration and Redo all depend on this.
4. **Version the file format** formally, with a written schema and upgrade steps (the app already
   upgrades version 2 files to version 3 on import).
5. **One build command with an edition flag**, alongside the existing release flag, so every
   edition is built and tested the same way.

## Feature ideas (any edition)

Ranked roughly by value.

### Planning

- **Dependencies.** Link one bar to another; a dependent bar moves when its predecessor moves;
  flag a link that has been broken by a date change.
- **Progress and status.** A percent-complete fill on each bar and a status (on track, at risk,
  late); anything unfinished behind the today line is flagged.
- **Baseline.** Save the dates as a baseline and show the original bar faintly behind the current
  one, so slippage is visible. (Falls out of version control in the app and SaaS builds.)
- **Week and day zoom.** Bars currently snap to whole months, which is too coarse for near-term work.
- **Owners and tags.** A person and free tags on each activity, shown as optional columns.
- **Sub-activities.** A third level under an activity, collapsible like workstreams.

### Finding and viewing

- **Filter and search.** A search box that dims everything that does not match; filters by
  workstream, status, owner, tag or date range.
- **Saved views.** Named combinations of filters, zoom and visible columns ("Board view", "Next quarter").
- **Presentation mode.** Full screen, step through milestones with the arrow keys.

### Editing

- **Multi-select.** Select several bars and move, recolour or hide them together.
- **Spreadsheet-style keyboard entry.** Tab and arrow keys between cells in the table.
- **Redo**, alongside Undo.
- **Copy and paste** rows between workstreams and between roadmaps; paste rows from a spreadsheet.

### Files and sharing

- **Excel import and export**, alongside CSV.
- **Several roadmaps** in the browser build, with a simple list to switch between them.
- **Shareable read-only link** that carries the roadmap in the address (browser build). The app
  itself is already shareable as a link; this is about sharing a particular roadmap.
- **PowerPoint export**: one slide per saved view.

### Quality and delivery

- **Purge old binaries from Git history.** Fonts and early video clips were removed from the
  repository but remain in its first two commits. Removing them means rewriting history and a
  forced push.
- **Run the tests on every push** with a hosted pipeline. Today the pipeline runs on version tags only.
- **Firefox and Safari.** Only Chrome has been checked so far.
- **Faster release builds.** Reuse narration and skip re-rendering a video when neither its script
  nor the app has changed.
- **Accessibility review** with a screen reader, and a check of colour contrast in both themes.

### Guide videos

- **A single overview film** of about two minutes, in addition to the five chapters.
- **Soft background music and chapter transitions.** Needs a licensed or generated track.
- **Other languages**: translated narration and subtitles from the same script.

## Suggested order

1. Dependencies, progress and status, filter and search (browser build; highest everyday value).
2. The groundwork in "What has to change first".
3. App build: workspace folder, then history, then compare and scenarios.
4. SaaS build: accounts and database, then live editing, then comments and sharing.
