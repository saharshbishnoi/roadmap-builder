/* Content for the Guide dialog (the Guide button at the end of the toolbar). Rebuild it whenever the app changes: rebuild the videos in app/guide/ with a
   release build (RELEASE=1 docker compose up -d --build) and bring the steps up to date. The requirements list is in
   docs/REQUIREMENTS.md. */
window.GUIDE=[
  {id:"read",title:"Read the roadmap",clip:"guide/01-read",steps:[
    "Stay in View mode. Move the pointer over a bar, milestone or critical path stage to see its hover card.",
    "The hover card stays where it opened. Drag it to place it anywhere; it then opens there for every item until you select Reset position.",
    "Click an item to open its dialog card with the full details. Use the arrow beside a workstream to collapse it.",
    "The schedule fills the window and scrolls on its own, up and down and sideways; the headings stay in place.",
    "Drag the year scale left or right to squeeze or stretch the timeline. Double-click it to fit the window. A faint line follows the pointer and shows the date under it.",
    "Right-click a row and choose Fit the timeline to this row: the timeline is scaled and scrolled so that row's dates fill the middle 80% of the screen.",
    "Drag the right edge of the Workstream / activity heading to make that column wider or narrower. Right-click a row, bar, milestone, card or the empty timeline for a menu of what you can do there.",
    "At the end of the toolbar, Dark or Light switches the theme, and Guide opens these steps in a large dialog. The videos shown match the theme you are in."]},
  {id:"rows",title:"Add and edit rows",clip:"guide/02-rows",steps:[
    "Switch to Edit. Type straight into a name or a date. Each row has a colour square, an eye to hide it, a pencil for all settings and a cross to delete.",
    "To add an activity, type a name in the highlighted Add an activity row at the end of a workstream and press Enter. Keep typing to add more. The last row adds a workstream.",
    "A new row has no dates. Type them, or click on its timeline to place it. With only a start date the bar fades out; with only an end date it fades in.",
    "The chips above the table choose what is written beside each bar: Activity, Start and End. A filled chip is on.",
    "The eyes in the header show or hide the Start and End columns, the critical path and the milestone lines."]},
  {id:"settings",title:"Properties",clip:"guide/03-settings",steps:[
    "The Properties panel on the right runs the full height of the window. Use Properties in the toolbar to show or hide it.",
    "In Edit mode, click a bar, milestone or stage, or the pencil on a row, to edit all of its settings at the top of the panel. The chart updates as you type, and each burst of typing is one Undo step.",
    "Write the hover card and the click dialog in Markdown. The preview sits under each box.",
    "Under Text, set the fonts, the overall text size, and the size of labels and of dates separately.",
    "Drag a bar to move it, drag either end to resize it, and drag the dotted handle to reorder rows."]},
  {id:"cards",title:"Cards and display",clip:"guide/04-cards",steps:[
    "Add a floating card or a panel card from Add, in the Properties panel. Edit a card title in place; the pencil opens the rest in the panel.",
    "Drag a floating card anywhere over the chart, and drag its right edge to change its width.",
    "Use the pin on a floating card to keep it on the row it sits on. A pinned card moves with its row, so it stays in the right place when rows are hidden in View mode. Unpinned, it stays a fixed distance from the top.",
    "Panel cards are on the Cards tab of the right panel. Lane headings, column headings and the Cards heading are edited in place.",
    "Under Display, Randomise colours gives the header and every workstream a fresh, matched set of colours; press it again for another idea, and use Light / dark to check each one in both themes. Undo brings the old colours back.",
    "Under Display, set the theme and rounded or square cards. Under Header, set the size and font of the heading, its colours, the name of the Cards tab, and whether the date chip on the right is shown and kept in exports. Under Timeline, set the start year and the number of years."]},
  {id:"json",title:"JSON and files",clip:"guide/05-json",steps:[
    "In Edit mode, select JSON in the toolbar. The editor opens as a full-height panel on the left, with one line per activity and its start and end.",
    "Change a name or a date and the chart follows. Copy a line to add an activity, delete a line to remove one.",
    "Lines are numbered, and a mistake is reported with its line. Press Ctrl+S, select Format, or click away from the editor to lay the text out neatly again, one item per line.",
    "Floating cards and panel cards are listed there too, one line each: change a title, a date or the Markdown text, copy a line to add a card, delete a line to remove one.",
    "Export, then Roadmap file (.json), saves everything. Import loads a .json roadmap file or a .csv activity list.",
    "Export, then Standalone page (.html), makes one file with the app and this roadmap inside. Send it to anyone; it opens in their browser with nothing to install.",
    "Standalone page, view only, makes the same single file but locked to View mode. It opens exactly as the roadmap looks when you export it: the same zoom, place on the timeline, collapsed workstreams, theme and panel.",
    "Export, then Image of this view, saves a picture of the timeline as it is on screen: the same zoom, starting where it is scrolled to, with every row. Image, whole timeline and the two PDF exports show the full timeline. Exports always look like View mode."]}
];
/* Where the offline copy of the latest release can be downloaded. */
window.DOWNLOAD_URL="https://github.com/saharshbishnoi/roadmap-builder/releases/latest/download/roadmap-builder.zip";
