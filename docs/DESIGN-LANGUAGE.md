# Roadmap Builder design language

How Roadmap Builder looks, moves and speaks. It applies to every edition (browser, app, SaaS) and to
the guide videos. The values below are the ones in `app/styles.css`; change them there and here together.

## Principles

1. **The control is on the thing it changes.** Names, dates, headings and colours are edited in
   place. Each row and card carries its own colour square, eye, pencil and cross. No menus or side
   panels hide settings; the only dropdown is Export.
2. **Nothing disappears while you edit.** A hidden item is dimmed in Edit mode and gone in View
   mode and in exports, so it can always be brought back.
3. **View is for reading, Edit is for changing.** View mode shows no controls at all.
4. **Calm by default.** Normal sentence case, square corners, one accent colour. Capitals, rounded
   cards and the 3D effect are choices the reader makes, not defaults.
5. **It moves, gently.** Things glide to their new place rather than jumping, quickly enough that
   nobody waits for an animation.
6. **Type, don't configure.** Adding a row is typing a name and pressing Enter. Dates are optional.

## Colour

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` | `#E9EDF4` | `#0C111B` | page background |
| `--surface` | `#FFFFFF` | `#161C2A` | chart, cards, bars of controls |
| `--ink` | `#172033` | `#E7EBF3` | text |
| `--muted` | `#5A6577` | `#9BA6B9` | secondary text, off-state chips |
| `--line` | `#D3D9E4` | `#2A3345` | borders, dividers |
| `--banner` | `#14275A` | same | banner and table header (editable) |
| `--accent` | `#2F6FED` | same | primary button, on-state chips, focus, highlights (editable) |
| `--today` | `#E11D48` | same | today line, destructive actions (editable) |

Workstream palette, used in order and editable per item:
`#1E88E5` `#2E8B2E` `#7E57C2` `#F07C1F` `#D49B00` `#12909A` `#4A5568` `#C2185B` `#6D4C41` `#3949AB`

Rules:

- A workstream's colour tints its rows (10% on the name, 6% on the timeline, stronger on the
  workstream row). Tints are mixed with `--surface`, so they work in both themes.
- Text on a coloured fill is chosen by brightness: dark ink on light fills, white on dark fills.
- Colour never carries meaning alone: hidden items are also dimmed, on-state chips are also filled.

## Type

- **Families:** Barlow for headings and text by default. Barlow Condensed, Inter, IBM Plex Sans and
  Source Sans 3 are offered; all are sans serif. The guide videos use Inter for title cards.
- **Sizes** (multiplied by the text-size setting, 90% to 120%): body 13px, table names 13px,
  workstream names 14px bold, card titles 17px bold, small labels 11px, banner title 24–38px.
- **Case:** sentence case everywhere. Headings are not capitalised unless the reader turns
  Capitals on. Wide letter-spacing (0.05–0.12em) is used only on small headings.
- **Numbers:** tabular figures, so dates line up in columns.

## Shape, depth and space

- **Corners:** cards, badges, hover cards and dialogs are square by default; Rounded cards gives
  them an 8px radius. Bars and critical-path stages are always pills. Buttons and inputs use 3–4px.
- **Card accent:** a 2px coloured border on floating cards, a 5px coloured left edge on panel
  cards, a 4px coloured top edge on hover cards and dialogs.
- **Depth:** a soft two-layer shadow on floating things (cards, hover card, dialog, menus). The 3D
  effect tilts cards up to 4 degrees towards the pointer and can be switched off.
- **Rhythm:** rows are 30px tall; controls are 22px squares with a 4px gap; panels use 12–14px
  padding. The left column is resizable.

## Motion

- **Movement** (bars, milestones, cards, column widths): 320ms, `cubic-bezier(.2,.8,.2,1)`.
- **State** (hover, on/off, dimming): 120–250ms ease.
- **Arrival:** rows and panels fade in over 200–260ms; settings unfold downward; dialogs rise 8px.
- Motion is switched off while dragging, while exporting, and when the computer asks for reduced motion.

## Components

| Component | Rule |
|---|---|
| Bar | 18px pill in the workstream or item colour. A missing date fades the bar towards the open side. |
| Milestone | 12px diamond. Key milestones sit in their own lane with a labelled date. |
| Chip | Choice that is on or off: filled with the accent when on, outlined in muted grey when off. |
| Eye | Show or hide. Open eye when shown, struck-through eye at half strength when hidden. |
| Add row | Last row of every workstream; highlights in the accent on hover and focus; Enter adds and keeps focus. |
| Item settings | Opens directly under the row, or inside the card, with a heavy outline and the item's colour on the left. |
| Hover card | Opens beside the pointer and stays put; can be dragged and remembers where it was put. |
| Right-click menu | Lists only what applies to the thing under the pointer; destructive actions last, in red. |
| Pointer line | 1px muted vertical line with a small date label, only over the timeline. |
| Toast | Bottom centre, dark on light, with Undo when something was removed. |

## Words

- Plain, short sentences. Say what a control does, not what it is called internally.
- British spelling (colour, programme). Dates as `01 Mar 2026`; ranges on bars as `03/2026 – 08/2028`.
- Buttons are verbs or nouns of one to three words: Add, Done, Hide, Duplicate, Delete, Export.
- Errors say what to do next: "The end date is before the start date. Move one of them."
- Placeholder content is deliberate nonsense, so nobody mistakes a sample for a real plan.

## Accessibility

- Everything works by keyboard: bars are focusable, arrows move them, Enter opens, Delete removes.
- A visible 2px accent focus ring on every control.
- Every icon-only control has a spoken label and a tooltip.
- Light and dark themes, four text sizes, and reduced motion are respected.

## Guide videos

- 4K, 30 frames a second, one light and one dark version of each chapter.
- Each chapter opens on a title card: a small spaced-out label, a large tight headline, a soft
  radial background. It fades into the live app.
- A soft pointer glides between targets and pulses on a click. One idea per scene, one or two
  sentences of narration per idea, subtitles on by default.
- Narration is a calm, natural female voice at broadcast loudness. No music.
