/* Content for the Guide and Features tabs of the right panel. Rebuild both whenever the app changes: rebuild the
   videos in app/guide/ with a release build (RELEASE=1 docker compose up -d --build) and bring the steps and the feature list up to date. */
window.GUIDE=[
  {id:"read",title:"Read the roadmap",clip:"guide/01-read",steps:[
    "Stay in View mode. Move the pointer over a bar, milestone or critical path stage to see its hover card.",
    "The hover card stays where it opened. Drag it to place it anywhere; it then opens there for every item until you select Reset position.",
    "Click an item to open its dialog card with the full details. Use the arrow beside a workstream to collapse it.",
    "A faint line follows the pointer across the timeline and shows the date under it.",
    "Drag the right edge of the Workstream / activity heading to make that column wider or narrower. Double-click the edge to reset it.",
    "Right-click a row, bar, milestone, card or the empty timeline for a menu of what you can do there."]},
  {id:"rows",title:"Add and edit rows",clip:"guide/02-rows",steps:[
    "Switch to Edit. Type straight into a name or a date. Each row has a colour square, an eye to hide it, a pencil for all settings and a cross to delete.",
    "To add an activity, type a name in the highlighted Add an activity row at the end of a workstream and press Enter. Keep typing to add more. The last row adds a workstream.",
    "A new row has no dates. Type them, or click on its timeline to place it. With only a start date the bar fades out; with only an end date it fades in.",
    "The chips above the table choose what is written beside each bar: Activity, Start and End. A filled chip is on.",
    "The eyes in the header show or hide the Start and End columns, the critical path and the milestone lines."]},
  {id:"settings",title:"All settings, on the item",clip:"guide/03-settings",steps:[
    "Click a bar, milestone or stage, or the pencil on a row, to open all of its settings directly under it.",
    "Change the workstream, type, dates and colour. The chart updates as you type, and each burst of typing is one Undo step.",
    "Write the hover card and the click dialog in Markdown. The preview sits under each box.",
    "Drag a bar to move it, drag either end to resize it, and drag the dotted handle to reorder rows."]},
  {id:"cards",title:"Cards, headings and display",clip:"guide/04-cards",steps:[
    "Add a floating card or a panel card from the Add bar. Edit a card title in place; the pencil opens the rest inside the card.",
    "Drag a floating card anywhere over the chart, and drag its right edge to change its width.",
    "Lane headings, column headings and the Cards heading are edited in place too.",
    "The Display bar sets the theme, fonts, text size, capitals and rounded or square cards. The start year, number of years and banner colours are in the banner."]},
  {id:"json",title:"JSON live editor and files",clip:"guide/05-json",steps:[
    "In Edit mode, open the JSON tab of the right panel. There is one line per activity with its start and end.",
    "Change a name or a date and the chart follows. Copy a line to add an activity, delete a line to remove one.",
    "Export, then Roadmap file (.json), saves everything. Import loads a .json roadmap file or a .csv activity list.",
    "For a release copy, export an image or a PDF. The export shows the roadmap as it looks in View mode."]}
];
window.REQS=[
  {group:"The roadmap",items:[
    ["Intuitive interactive view","Collapsible workstreams with summary bars beside a month-scaled timeline"],
    ["Placeholder content is nonsense, with no real programme wording","Load sample roadmap, in the Add bar in Edit mode"],
    ["Today's date is shown","Date chip in the banner and a dashed today line"],
    ["Key milestones across the top, each with its own colour","Key milestones lane"],
    ["Each milestone's vertical line can be shown or hidden","Click the milestone in Edit mode, Vertical line"],
    ["Top-level critical path with its own dates","Critical path lane; edit stages in Edit mode"],
    ["Critical path can be shown or hidden in View mode","Eye beside Critical path, in Edit mode"]]},
  {group:"Interaction",items:[
    ["View mode for reading and Edit mode for changing","View / Edit switch in the toolbar"],
    ["Hover cards and click dialog cards on items","Hover or click any bar, milestone or stage"],
    ["Card content is written in Markdown","Pencil on any item, with a preview under each box"],
    ["Editing happens on the elements, not in menus or side panels","Edit mode: inline names, dates, headings, colours and eye icons; full settings open under the item"],
    ["JSON live editor for dates and activities","JSON tab of the right panel, in Edit mode"],
    ["Start and end dates as columns and beside the bars","Eyes on the Start and End headings; chips above the table for Activity, Start and End beside the bars"],
    ["Add rows by typing, like a list","Add an activity row at the end of each workstream, and Add a workstream at the bottom"],
    ["Dates are optional","A bar with one date fades towards the open side; a row with none can be placed with a click"],
    ["Right-click menu that fits what is under the pointer","Right-click a row, bar, milestone, stage, card or the empty timeline, in either mode"],
    ["Resizable activity column","Drag the right edge of the Workstream / activity heading"],
    ["Hover cards can be moved","Drag a hover card to place it; Reset position puts it back beside the pointer"],
    ["Cards can be created and placed on top of the chart","+ Floating card; drag to position"],
    ["Cards have a 3D floating effect, including the right panel","Floating cards and the Cards tab; switch off with 3D cards in the Display bar"],
    ["Square or rounded cards","Rounded cards in the Display bar: floating, panel, hover and dialog cards"]]},
  {group:"Appearance",items:[
    ["Every colour can be changed in Edit mode, milestones included","Colour squares on rows and cards; banner, text and today line colours in the banner; Highlight in the Display bar"],
    ["Light and dark mode","Display bar, Theme"],
    ["Sans-serif fonts that can be changed","Display bar: heading font, text font, text size, capitals (off by default). Custom installed fonts beside each font list in Edit mode"]]},
  {group:"Files and release",items:[
    ["Everything can be exported to and imported from files","Export, Roadmap file (.json); Import"],
    ["Export an image or a PDF for the final release","Export: PNG, PDF A3 landscape, PDF exact size"],
    ["Runs in a container with compose up and compose down","docker-compose.yml, Dockerfile and nginx.conf in the project"],
    ["One build command, with a release flag","RELEASE=1 docker compose up -d --build also runs every test and renders the guide videos"]]},
  {group:"Help",items:[
    ["A features list and a guide with narrated, subtitled 4K videos in light and dark","This panel: Guide and Features tabs. The videos are made by a release build"],
    ["A faint line follows the pointer across the timeline","Move the pointer over the chart; the date under it is shown at the top"],
    ["Smooth animation","Bars, cards and panels glide to their new place; switched off if the computer asks for reduced motion"],
    ["The right panel is adjustable","Drag the divider on its left edge, or focus it and use the arrow keys"]]}
];
window.RUNREQS=[
  ["Docker Engine with the Compose plugin (docker compose v2)","To build and run the container"],
  ["Internet access while building","Every build fetches the web server image, the libraries and the fonts. A release build (RELEASE=1) also fetches its test and video tools"],
  ["A current desktop browser","Tested in Chrome. Edge uses the same engine. Firefox and Safari have not been tested"],
  ["No internet connection at runtime","Libraries, fonts and guide videos are served from the container"]
];
