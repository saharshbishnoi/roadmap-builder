/* Content for the Guide and Requirements tabs of the right panel. Edit the text here; the clips live in app/guide/. */
window.GUIDE=[
  {id:"read",title:"Read the roadmap",clip:"guide/01-read",steps:[
    "Stay in View mode. Move the pointer over a bar, milestone or critical path stage to see its hover card.",
    "Click the item to open its dialog card with the full details.",
    "Use the arrow beside a workstream to collapse or expand it."]},
  {id:"move",title:"Move, resize and reorder",clip:"guide/02-move",steps:[
    "Switch to Edit.",
    "Drag a bar to move it. Drag either end to make it longer or shorter. Bars snap to whole months.",
    "Drag the dotted handle beside a name to reorder rows or move a row to another workstream.",
    "Undo steps back through every change."]},
  {id:"editor",title:"Edit on the roadmap itself",clip:"guide/03-editor",steps:[
    "In Edit mode, type straight into a name, a date, a card title or a lane or column heading. Use the colour square, eye, pencil and cross on each row and card.",
    "Click a bar, milestone or stage, or the pencil on a row or card, to open all of its settings directly under it. The chart updates as you type.",
    "Write the hover card and the click dialog in Markdown. The preview sits under each box.",
    "The start year, number of years and banner colours are in the banner. The JSON tab in the right panel lists one activity per line with its dates, and is also live."]},
  {id:"top",title:"Key milestones and the critical path",clip:"guide/04-milestones",steps:[
    "Click a key milestone to change its colour and to show or hide its vertical line.",
    "Drag a critical path stage to move it, or drag its ends to change its dates.",
    "In Edit mode, use the eye beside Critical path or Key milestones to hide the lane or the lines. Hidden things stay dimmed in Edit mode and disappear in View mode."]},
  {id:"cards",title:"Floating cards and panel cards",clip:"guide/05-cards",steps:[
    "Select + Floating card in the Add bar. Edit its title in place, and select its pencil to write the content in Markdown inside the card.",
    "Drag the card anywhere over the chart. Drag its right edge to change its width.",
    "Select + Panel card to add a card to the Cards tab on the right."]},
  {id:"visual",title:"Visualisation settings",clip:"guide/06-visualisation",steps:[
    "Use the Display bar under the toolbar to switch between light and dark.",
    "Pick the heading font, the text font and the text size. All the listed fonts are sans serif.",
    "In Edit mode, the eyes in the chart header show or hide the Start and End columns and the activity name, start date and end date beside each bar.",
    "Drag the divider beside the right panel to change its width."]},
  {id:"files",title:"Import, export and release",clip:"guide/07-files",steps:[
    "Export, then Roadmap file (.json), saves everything: content, cards, colours, fonts and settings.",
    "Import loads a .json roadmap file or a .csv activity list. You can also drop a file onto the page.",
    "For a release copy, export an image or a PDF. The export always shows the roadmap as it looks in View mode."]}
];
window.REQS=[
  {group:"The roadmap",items:[
    ["One-page web app in the style of a Jira BigPicture Gantt","Collapsible workstreams with summary bars beside a month-scaled timeline"],
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
    ["Start and end dates as columns and beside the bars","Eyes in the chart header: Start and End columns; On bars: Activity, Start, End"],
    ["Cards can be created and placed on top of the chart","+ Floating card; drag to position"],
    ["Cards have a 3D floating effect, including the right panel","Floating cards and the Cards tab; switch off with 3D cards in the Display bar"]]},
  {group:"Appearance",items:[
    ["Every colour can be changed in Edit mode, milestones included","Colour squares on rows and cards; banner, text and today line colours in the banner; Highlight in the Display bar"],
    ["Light and dark mode","Display bar, Theme"],
    ["Sans-serif fonts that can be changed","Display bar: heading font, text font, text size, capitals (off by default). Custom installed fonts beside each font list in Edit mode"]]},
  {group:"Files and release",items:[
    ["Everything can be exported to and imported from files","Export, Roadmap file (.json); Import"],
    ["Export an image or a PDF for the final release","Export: PNG, PDF A3 landscape, PDF exact size"],
    ["Runs in a container with compose up and compose down","docker-compose.yml, Dockerfile and nginx.conf in the project"]]},
  {group:"Help",items:[
    ["Requirements and a guide with short video clips","This panel: Guide and Requirements tabs"],
    ["The right panel is adjustable","Drag the divider on its left edge, or focus it and use the arrow keys"]]}
];
window.RUNREQS=[
  ["Docker Engine with the Compose plugin (docker compose v2)","To build and run the container"],
  ["Access to an image registry that has nginx:1.27-alpine","Only for the first build"],
  ["A current desktop browser","Tested in Chrome. Edge uses the same engine. Firefox and Safari have not been tested"],
  ["No internet connection at runtime","Libraries, fonts and guide clips are served from the container"]
];
