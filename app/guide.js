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
  {id:"editor",title:"Edit in the live editor",clip:"guide/03-editor",steps:[
    "In Edit mode, click any bar, milestone, stage or card. It opens in the live editor on the left.",
    "Change the name, dates or colour. The chart updates as you type.",
    "Write the hover card and the click dialog in Markdown. The preview sits under each box.",
    "The Roadmap tab holds the title, timeline and colours. The Source tab is the whole roadmap as JSON, also live."]},
  {id:"top",title:"Key milestones and the critical path",clip:"guide/04-milestones",steps:[
    "Click a key milestone to change its colour and to show or hide its vertical line.",
    "Drag a critical path stage to move it, or drag its ends to change its dates.",
    "Open Visualisation and untick Critical path or Milestone lines to hide them. This also works in View mode."]},
  {id:"cards",title:"Floating cards and panel cards",clip:"guide/05-cards",steps:[
    "Choose Add, then Floating card. Write its content in Markdown in the live editor.",
    "Drag the card anywhere over the chart. Drag its right edge to change its width.",
    "Choose Add, then Panel card, to add a card to the Cards tab on the right."]},
  {id:"visual",title:"Visualisation settings",clip:"guide/06-visualisation",steps:[
    "Open Visualisation to switch between light and dark.",
    "Pick the heading font, the text font and the text size. All the listed fonts are sans serif.",
    "Turn the today line, date labels, floating cards, right panel and 3D card effect on or off.",
    "Drag the divider beside the right panel or the live editor to change its width."]},
  {id:"files",title:"Import, export and release",clip:"guide/07-files",steps:[
    "Export, then Roadmap file (.json), saves everything: content, cards, colours, fonts and settings.",
    "Import loads a .json roadmap file or a .csv activity list. You can also drop a file onto the page.",
    "For a release copy, export an image or a PDF. The export always shows the roadmap as it looks in View mode."]}
];
window.REQS=[
  {group:"The roadmap",items:[
    ["One-page web app in the style of a Jira BigPicture Gantt","Collapsible workstreams with summary bars beside a month-scaled timeline"],
    ["Placeholder content is nonsense, with no real programme wording","Load sample roadmap, in the Settings menu"],
    ["Today's date is shown","Date chip in the banner and a dashed today line"],
    ["Key milestones across the top, each with its own colour","Key milestones lane"],
    ["Each milestone's vertical line can be shown or hidden","Live editor, Vertical line"],
    ["Top-level critical path with its own dates","Critical path lane; edit stages in Edit mode"],
    ["Critical path can be shown or hidden in View mode","Visualisation, Critical path"]]},
  {group:"Interaction",items:[
    ["View mode for reading and Edit mode for changing","View / Edit switch in the toolbar"],
    ["Hover cards and click dialog cards on items","Hover or click any bar, milestone or stage"],
    ["Card content is written in Markdown","Live editor, with a preview under each box"],
    ["Live editor on the left","Docked beside the roadmap in Edit mode: Selected item, Roadmap and Source tabs"],
    ["Cards can be created and placed on top of the chart","Add, Floating card; drag to position"],
    ["Cards have a 3D floating effect, including the right panel","Floating cards and the Cards tab; switch off in Visualisation"]]},
  {group:"Appearance",items:[
    ["Every colour can be changed in Edit mode, milestones included","Colour boxes in the live editor; banner, buttons and today line on the Roadmap tab"],
    ["Light and dark mode","Visualisation, Theme"],
    ["Sans-serif fonts that can be changed","Visualisation: heading font, text font, text size, capitals. Custom installed fonts on the Roadmap tab"]]},
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
