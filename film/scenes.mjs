// The product film: every scene, what happens on screen and what is said, in one file.
//
// Each scene has `cards` (words on the backdrop), `steps` (things done in the app) and `lines` (what the voice
// says). There must be exactly one line per card and one per step, in order; the recorder refuses to run otherwise.
// A line is written for the ear. Where the voice needs a different spelling from the subtitles, give both:
//   { say: "Open the Jayson tab.", show: "Open the JSON tab." }
// In a step the action happens first; the line then says what just happened, and the picture holds for the
// length of the line plus half a second.
//
// `f` is the recorder's small toolkit: click, hover, type, key, set, drag, sweep, menu, waitFor, pause, open, eval.

const TAGLINE = "Your whole programme, in one intuitive, interactive view.";
const idOf = (f, name) => f.eval(n => window.__roadmap.state.activities.find(a => a.name === n).id, name);

export const FILM = {
  name: "Roadmap Builder",
  tagline: TAGLINE,
  audience: "PMO and delivery teams",
  address: "saharshbishnoi.github.io/roadmap-builder",

  opening: {
    id: "00-opening", title: "Opening",
    cards: [{ heading: "Roadmap Builder", line: TAGLINE }, { heading: "The full tour", line: "Six chapters, one sample programme." }],
    steps: [],
    lines: ["Roadmap Builder. Your whole programme, in one intuitive, interactive view.", "Here is the full tour."]
  },

  chapters: [
    { id: "01-read", title: "Read the roadmap", mode: "view", props: false,
      cards: [{ heading: "Read the roadmap", line: "Every workstream on one timeline." }],
      steps: [
        async f => { await f.pause(500); },
        async f => { await f.hover("#b-a4", { fx: 0.35 }); await f.waitFor("#hover"); },
        async f => { await f.drag("#hover", 300, 170, { fx: 0.2, fy: 0.12 }); },
        async f => { await f.click("#b-a1", { fx: 0.3 }); await f.waitFor("#sheet .card"); },
        async f => { await f.click('[data-sheet="close"]'); await f.hover("#r-a9 .track"); await f.scroll("#chart", 460, 1400); await f.pause(300); },
        async f => { await f.scroll("#chart", -460, 1100); await f.sweep("#r-a8 .track", 0.1, 0.7, 2400); await f.waitFor("#xline"); },
        async f => { await f.click("#ct-p1"); await f.pause(500); },
        async f => { await f.click("#ct-p1"); await f.drag(".years", 170, 0, { fx: 0.3 }); await f.pause(400); },
        async f => { await f.click("#r-a11 .aname", { button: "right" }); await f.menu("Fit the timeline to this row"); await f.pause(600); }
      ],
      lines: [
        "Chapter one. Read the roadmap.",
        "This is a sample programme. Workstreams run down the left. Months run across the top.",
        "Point at a bar. Its card shows the dates and a note.",
        "Drag the card. It stays where you put it.",
        "Click a bar. The full details open.",
        "Scroll down. The schedule moves on its own, and the headings stay in place.",
        "Back at the top, move across the timeline. A thin line names the date under the pointer.",
        "Collapse a workstream. It folds into one summary bar.",
        "Open it again, and drag the year scale. The timeline stretches.",
        "Right-click a row and fit the timeline to it. The row fills the middle of the screen."
      ] },

    { id: "02-edit", title: "Edit in place", mode: "view", props: false,
      cards: [{ heading: "Edit in place", line: "Type where you look." }],
      steps: [
        async f => { await f.click("#modeEdit"); await f.waitFor("#n-a2"); },
        async f => { await f.click("#n-a2", { fx: 0.9 }); await f.key("End"); await f.type(" (phase one)"); await f.key("Enter"); },
        async f => { await f.click("#ds-a2", { fx: 0.3 }); await f.set("#ds-a2", "2026-10-01"); },
        async f => { await f.click("#an-p1"); await f.type("Order more carrots"); await f.key("Enter"); await f.pause(300); await f.type("Thank the wombats"); await f.key("Enter"); },
        async f => { await f.click("#pl-" + await idOf(f, "Order more carrots"), { fx: 0.22 }); await f.pause(400); },
        async f => { const id = await idOf(f, "Thank the wombats"); await f.click("#ds-" + id, { fx: 0.3 }); await f.set("#ds-" + id, "2027-06-01"); await f.waitFor("#b-" + id); },
        async f => { await f.click("#ey-barName"); await f.pause(400); },
        async f => { await f.click("#eh-a5"); await f.pause(400); }
      ],
      lines: [
        "Chapter two. Edit in place.",
        "Switch to Edit. Every name and every date is now a field.",
        "Type in a row. The activity is renamed.",
        "Change a start date. The bar moves.",
        "Type in the add row and press Enter. Twice. Two new activities.",
        "A new row has no dates. Click its timeline. The bar lands there.",
        "Give the other one a start date only. Its bar fades out.",
        "Turn on the Activity chip. Names appear beside the bars.",
        "Click an eye. The row dims here, and leaves View mode."
      ] },

    { id: "03-item", title: "Properties", mode: "edit", columns: false,
      cards: [{ heading: "Properties", line: "Every setting for the thing you click." }],
      steps: [
        async f => { await f.click("#b-a2"); await f.waitFor("#propsItem #istrip"); await f.pause(400); },
        async f => { await f.hover("#f-color"); await f.ring(); await f.set("#f-color", "#f07c1f"); await f.pause(300); },
        async f => { await f.click("#f-hover"); await f.type("**Ready** by spring. Bring a spanner."); },
        async f => { await f.click("#dx-done"); await f.drag("#b-a3", 72, 0); },
        async f => { await f.drag("#b-a3", 60, 0, { fx: 0.97 }); },
        async f => { await f.click("#b-a5", { button: "right" }); await f.menu("Make it a milestone"); await f.pause(300); },
        async f => { await f.click("#undo"); await f.pause(300); },
        async f => { await f.click("#propBtn"); await f.pause(900); await f.click("#propBtn"); await f.pause(400); },
        async f => { await f.hover("#t-labelScale"); await f.ring(); await f.set("#t-labelScale", "120"); await f.pause(500); await f.hover("#t-dateScale"); await f.ring(); await f.set("#t-dateScale", "90"); await f.pause(300); }
      ],
      lines: [
        "Chapter three. Properties.",
        "Click a bar. Its settings open in the Properties panel.",
        "Pick a colour. The bar repaints.",
        "Write the hover card in Markdown. The preview updates below.",
        "Close the settings and drag a bar. It moves by whole months.",
        "Drag its edge. It gets longer.",
        "Right-click a bar and make it a milestone. It becomes a diamond.",
        "Undo. The bar is back.",
        "The Properties button hides the panel, and brings it back.",
        "Set the label size and the date size. Names grow. Dates shrink."
      ] },

    { id: "04-cards", title: "Cards and display", mode: "edit", columns: false,
      cards: [{ heading: "Cards and display", line: "Notes on the chart, and the look you want." }],
      steps: [
        async f => { await f.drag("#fc-f1 .md", -140, 60); },
        async f => { await f.click("#eh-a3"); await f.click("#eh-a4"); await f.click("#modeView"); await f.pause(700); },
        async f => { await f.click("#modeEdit"); await f.click("#pt-cards"); await f.click("#ce-n-n1-title"); await f.key("Control+A"); await f.type("Tea, always"); await f.key("Enter"); },
        async f => { await f.click("#pe-n2"); await f.waitFor("#tabCards #istrip"); await f.click("#f-md"); await f.key("Control+End"); await f.type(" Then **admired again**."); },
        async f => { await f.click("#dx-done"); await f.click("#pt-props"); await f.click("#t-roundCards"); await f.pause(400); },
        async f => { await f.hover("#t-theme"); await f.ring(); await f.set("#t-theme", "dark"); await f.pause(500); },
        async f => { await f.hover("#t-fontHead"); await f.ring(); await f.set("#t-fontHead", "inter"); await f.pause(400); },
        async f => { await f.hover("#t-theme"); await f.ring(); await f.set("#t-theme", "light"); await f.hover("#r-banner"); await f.ring(); await f.set("#r-banner", "#0f5c4a"); await f.pause(400); }
      ],
      lines: [
        "Chapter four. Cards and display.",
        "Drag a floating card. It sits anywhere on the chart.",
        "Hide two rows and switch to View. The pinned cards move up with their rows.",
        "Back in Edit, open the Cards tab. Click a card title and retype it.",
        "The pencil opens the card's text. It is Markdown, and the card updates as you type.",
        "In Properties, tick Rounded cards. Every corner softens.",
        "Switch the theme. The roadmap goes dark.",
        "Pick another heading font. The headings change.",
        "Back to light, and change the banner colour in the banner itself."
      ] },

    { id: "05-json", title: "JSON live editor", mode: "edit", props: false, columns: false,
      cards: [{ heading: "JSON live editor", line: "One line per activity, and per card." }],
      steps: [
        async f => { await f.click("#jsonBtn"); await f.waitFor("#src"); await f.pause(400); },
        async f => { await f.select("#src", "2028-08-31"); await f.type("2027-03-31", 100); await f.waitFor("#srcStatus", { text: "Valid" }); },
        async f => { await f.select("#src", "Paint the invisible fence"); await f.type("Paint it twice", 70); await f.waitFor("#srcStatus", { text: "Valid" }); },
        async f => { await f.select("#src", '"milestone":"2027-01-15"}', "after"); await f.type(',\n      {"name":"Count the wombats","start":"2027-02-01","end":"2027-09-30"}', 28); await f.waitFor("#srcStatus", { text: "Valid" }); },
        async f => { await f.select("#src", '"workstreams":['); await f.type('"workstreams":', 60); await f.waitFor("#srcStatus", { text: "Not applied" }); },
        async f => { await f.type("[", 60); await f.waitFor("#srcStatus", { text: "Valid" }); },
        async f => { await f.key("Control+s"); await f.waitFor("#srcStatus", { text: "formatted" }); await f.pause(400); },
        async f => { await f.select("#src", 'Wombat Wrangling","badge"'); await f.type('Wombat herding","badge"', 60); await f.waitFor("#srcStatus", { text: "Valid" }); }
      ],
      lines: [
        { say: "Chapter five. The Jayson live editor.", show: "Chapter five. The JSON live editor." },
        { say: "Open the Jayson editor. It fills the left side, with numbered lines, one per activity.", show: "Open the JSON editor. It fills the left side, with numbered lines, one per activity." },
        "Retype an end date. The bar shortens as you type.",
        "Rename an activity here. Its row updates.",
        "Add a line. A new activity appears on the chart.",
        "Break the syntax. Nothing is applied, and the message names the line.",
        "Fix it. The roadmap is in step again.",
        "Save with Control S. The text is laid out again, and the new line gets its id.",
        "Cards are listed too. Retype a title, and the card on the chart changes."
      ] },

    { id: "06-share", title: "Share it", mode: "view", props: false,
      cards: [{ heading: "Share it", line: "A file, a picture, or one page." }],
      steps: [
        async f => { await f.click("#exBtn"); await f.waitFor("#exMenu"); },
        async f => { await f.click('[data-act="exJson"]'); await f.waitFor("#toast", { text: "Saved" }); },
        async f => { await f.click("#exBtn"); await f.click('[data-act="exHtml"]'); await f.waitFor("#toast", { text: ".html" }); },
        async f => { await f.open(await f.exported(".html")); await f.waitFor("#inner .row"); },
        async f => { await f.hover("#b-a4", { fx: 0.35 }); await f.waitFor("#hover"); },
        async f => { await f.open("app/index.html"); await f.waitFor("#inner .row"); await f.click("#r-a11 .aname", { button: "right" }); await f.menu("Fit the timeline to this row"); await f.pause(500);
          await f.click("#exBtn"); await f.click('[data-act="exPng"]'); await f.waitFor("#toast", { text: ".png", frames: 900 }); },
        async f => { await f.click("#exBtn"); await f.click('[data-act="exPdfA3"]'); await f.waitFor("#toast", { text: ".pdf", frames: 900 }); },
        async f => { await f.hover("#helpBtn"); await f.ring(); await f.open("app/help.html"); await f.waitFor(".gstep"); await f.pause(500); }
      ],
      lines: [
        "Chapter six. Share it.",
        "Open Export. The formats are listed.",
        "Save the roadmap file. It holds the whole roadmap.",
        "Export a standalone page. That is the app and this roadmap in one file.",
        "Here is that file, opened on its own. No server.",
        "It is the same roadmap. Hover cards still work.",
        "Back in the app, fit the timeline to a row and export an image of this view. The picture shows what is on screen.",
        "Export a PDF on one A3 page. It is saved too.",
        "Help opens in its own window. Here it is, with the steps for every part."
      ] }
  ],

  closing: {
    id: "99-closing", title: "Closing",
    cards: [{ heading: "Roadmap Builder", line: "Your whole programme, in one view.", small: "saharshbishnoi.github.io/roadmap-builder" }],
    steps: [],
    lines: ["Roadmap Builder. Your whole programme, in one view."]
  }
};
