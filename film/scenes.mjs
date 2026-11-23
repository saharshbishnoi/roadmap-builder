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
    lines: [
      "Welcome to Roadmap Builder. It gives you a whole programme in one intuitive, interactive view, and it all runs in an ordinary browser.",
      "Over the next few minutes we will take the full tour, in six short chapters, using a made-up programme so you can see how it fits together."
    ]
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
        "Let's begin with the simplest thing you can do with a roadmap, which is to read it.",
        "This is our sample programme. Each coloured band on the left is a workstream with its activities beneath it, and time runs across the top, so you can see at a glance what happens when.",
        "When you want to know more about something, just point at it. A small card appears with its dates and any note the author left.",
        "If the card is in your way, pick it up and move it. It keeps opening in the spot you chose, which is handy when you are presenting.",
        "For the full story, click the bar. A dialog opens with everything written about that activity.",
        "Longer programmes run off the bottom of the screen, so the schedule scrolls on its own. Notice that the years and the headings stay put.",
        "Back at the top, move across the timeline. A faint line follows your pointer and tells you the exact date underneath it.",
        "When you only care about the big picture, collapse a workstream. Its activities fold away into one summary bar.",
        "Open it again, and try dragging the year scale itself. The timeline stretches under your hand, so you can zoom in on a busy period.",
        "And if you want one row to fill the screen, right-click it and choose fit. The timeline scales so that row sits neatly in the middle."
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
        "Reading is only half of it. Next, let's change things, and you will see that editing happens right where you are looking.",
        "Switch to Edit, and the roadmap quietly becomes a form. Every name and every date turns into a field you can type in.",
        "To rename an activity, click its name and type. There is no save button to remember. The change is kept as you go.",
        "Dates work the same way. Change a start date in the row, and you can watch the bar slide along the timeline to match.",
        "Adding work is just as quick. Type a name in the highlighted row and press Enter, then keep typing to add another. It feels like filling in a list.",
        "New activities start without dates, because you often know the work before you know the timing. When you are ready, click the row's timeline and the bar lands there.",
        "Sometimes you only know when something begins. Give it a start date and nothing else, and its bar fades out, an honest way of saying the end is still open.",
        "These chips decide what is written beside each bar. Turn on Activity, and every bar is labelled with its name.",
        "And if a row is not ready to be seen, click its eye. It dims here so you can still find it, and it disappears from View and from anything you export."
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
        async f => { await f.hover("#t-labelScale"); await f.ring(); await f.set("#t-labelScale", "120"); await f.pause(500); await f.hover("#t-dateScale"); await f.ring(); await f.set("#t-dateScale", "90"); await f.pause(300); },
        async f => { await f.hover("#t-bannerScale"); await f.ring(); await f.set("#t-bannerScale", "125"); await f.pause(600); await f.hover("#t-bannerFont"); await f.ring(); await f.set("#t-bannerFont", "inter"); await f.pause(300); },
        async f => { await f.click("#t-showChip"); await f.pause(500); },
        async f => { await f.click("#t-showChip"); await f.click("#r-years"); await f.set("#r-years", "6"); await f.pause(500); }
      ],
      lines: [
        "Quick changes happen on the chart. For everything else, there is one place to go, the Properties panel.",
        "Click any bar, and all of its settings appear in the panel on the right. The details sit beside the chart, not on top of it.",
        "Change the colour, and the bar repaints straight away, so you can try a few until one looks right.",
        "This is where you write the hover card too. It is plain text with simple formatting, and the preview underneath shows exactly how it will read.",
        "Close the settings when you are done. And remember you can simply drag a bar to move it. It snaps to whole months, so things stay tidy.",
        "Dragging an edge changes how long it runs. That is often faster than typing a date when you are sketching a plan.",
        "Not everything is a stretch of work. Right-click a bar and make it a milestone, and it becomes a single diamond on the day that matters.",
        "Changed your mind? Undo steps back through what you did, one change at a time, so it is safe to experiment.",
        "When you want more room for the chart, the Properties button tucks the panel away, and brings it back when you need it.",
        "Further down, set the size of the labels and of the dates separately. Here the names grow while the dates shrink, which suits a screen at the back of a room.",
        "The header has its own settings. Choose a size and a font, and the heading follows.",
        "There is a date chip in the corner of the header. If you would rather not show it, untick it and it is gone.",
        "Bring it back, and look at Timeline. Ask for six years instead of eight, and the whole scale redraws to fit."
      ] },

    { id: "04-cards", title: "Cards and display", mode: "edit", columns: false,
      cards: [{ heading: "Cards and display", line: "Notes on the chart, and the look you want." }],
      steps: [
        async f => { await f.drag("#fc-f1 .md", -140, 60); },
        async f => { await f.click("#eh-a3"); await f.click("#eh-a4"); await f.click("#modeView"); await f.pause(700); },
        async f => { await f.click("#modeEdit"); await f.click("#pt-cards"); await f.click("#ce-n-n1-title"); await f.key("Control+A"); await f.type("Tea, always"); await f.key("Enter"); },
        async f => { await f.click("#pe-n2"); await f.waitFor("#tabCards #istrip"); await f.click("#f-md"); await f.key("Control+End"); await f.type(" Then **admired again**."); },
        async f => { await f.click("#dx-done"); await f.click("#pt-props"); await f.click("#r-panelTitle"); await f.key("Control+A"); await f.type("House rules"); await f.pause(400); },
        async f => { await f.click("#t-roundCards"); await f.pause(400); },
        async f => { await f.hover("#t-theme"); await f.ring(); await f.set("#t-theme", "dark"); await f.pause(500); },
        async f => { await f.click("#randCol"); await f.pause(700); },
        async f => { await f.click("#randCol"); await f.pause(600); await f.click("#flipTheme"); await f.pause(600); }
      ],
      lines: [
        "A roadmap is more than bars. Let's look at the notes you can add around them, and at making the whole thing look like yours.",
        "Floating cards are notes that sit on top of the chart. Drag one to wherever it tells the story best.",
        "Each card is pinned to the row it sits on. Watch as we hide two rows and switch to View. The cards move up with their rows, so they still point at the right thing.",
        "Back in Edit, there is a second kind of card on the right, good for principles or key messages. Click a title and simply retype it.",
        "The pencil opens the rest of the card. The text uses the same simple formatting as before, and the card updates as you type.",
        "The heading of this group is yours to name as well. Rename it in Properties, and the tab at the top changes with it.",
        "Now for the look. Tick rounded cards, and every corner softens. It is a small change that shifts the whole feel.",
        "Prefer a dark screen? Switch the theme, and the entire roadmap follows.",
        "And when you are not sure what colours to use, let the app suggest some. Randomise colours gives every workstream a fresh, matched colour.",
        "Press it again for another idea, then flip back to light. Each set is chosen to read well in both, and Undo takes you back to where you started."
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
        { say: "Sometimes it is quicker to edit a plan as text. For that, there is a live Jayson editor.", show: "Sometimes it is quicker to edit a plan as text. For that, there is a live JSON editor." },
        "Open it, and it takes the left side of the screen. Every activity is one numbered line with its start and its end, so the whole plan is easy to scan.",
        "Retype an end date, and the bar on the right shortens as you type. The two views are always the same roadmap.",
        "Names work the same way. Change one here, and its row updates beside it.",
        "To add an activity, just add a line. A moment later it appears on the chart, in the workstream you put it under.",
        "Typing mistakes happen. When they do, nothing is changed. The editor says what is wrong and marks the line, so your roadmap is never left half broken.",
        "Put it right, and the message clears. The roadmap and the text are back in step.",
        "Press Control S to tidy up. The text is laid out neatly again, and the line we added is given its own id.",
        "Cards are in here too. Retype a title in the text, and the card on the chart changes to match."
      ] },

    { id: "06-share", title: "Share it", mode: "view", props: false,
      cards: [{ heading: "Share it", line: "A file, a picture, or one page." }],
      steps: [
        async f => { await f.click("#exBtn"); await f.waitFor("#exMenu"); },
        async f => { await f.click('[data-act="exJson"]'); await f.waitFor("#toast", { text: "Saved" }); },
        async f => { await f.click("#exBtn"); await f.click('[data-act="exHtml"]'); await f.waitFor("#toast", { text: ".html" }); },
        async f => { await f.open(await f.exported(".html")); await f.waitFor("#inner .row"); },
        async f => { await f.hover("#b-a4", { fx: 0.35 }); await f.waitFor("#hover"); },
        async f => { await f.open("app/index.html"); await f.waitFor("#inner .row"); await f.click("#ct-p2"); await f.click("#exBtn"); await f.click('[data-act="exHtmlView"]'); await f.waitFor("#toast", { text: "-view.html" });
          await f.open(await f.exported("-view.html")); await f.waitFor("#inner .row"); await f.pause(400); },
        async f => { await f.open("app/index.html"); await f.waitFor("#inner .row"); await f.click("#r-a11 .aname", { button: "right" }); await f.menu("Fit the timeline to this row"); await f.pause(500);
          await f.click("#exBtn"); await f.click('[data-act="exPng"]'); await f.waitFor("#toast", { text: ".png", frames: 900 }); },
        async f => { await f.click("#exBtn"); await f.click('[data-act="exPdfA3"]'); await f.waitFor("#toast", { text: ".pdf", frames: 900 }); },
        async f => { await f.hover("#helpBtn"); await f.ring(); await f.open("app/help.html"); await f.waitFor(".gstep"); await f.pause(500); }
      ],
      lines: [
        "A roadmap is only useful when other people can see it. So, finally, let's share it.",
        "Everything you need is under Export. There are several formats, depending on who it is for.",
        "The roadmap file is your master copy. It holds everything, and it is what you would keep, or hand to a colleague who wants to carry on editing.",
        "For someone who just needs to open it, export a standalone page. That is the whole app and this roadmap, packed into a single file.",
        "Here is that file, opened on its own. There is no server behind it, and nothing to install.",
        "And it is still the real thing. The hover cards work, and the person you sent it to can explore it for themselves.",
        "If you would rather they look but not change anything, collapse what they do not need and export a view-only page. It opens exactly as you left it, with no Edit button.",
        "For a slide, fit the timeline to the part you want to talk about and export an image of this view. The picture shows just what is on your screen.",
        "For print, there is a PDF that fits the whole roadmap onto a single A3 page.",
        "And if you ever get stuck, Help opens in its own window, with every step written down for each part of the app."
      ] }
  ],

  closing: {
    id: "99-closing", title: "Closing",
    cards: [{ heading: "Roadmap Builder", line: "Your whole programme, in one view.", small: "saharshbishnoi.github.io/roadmap-builder" }],
    steps: [],
    lines: [
      "That is Roadmap Builder. Your whole programme in one view, ready to read, to change, and to share."
    ]
  }
};
