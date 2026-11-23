# Video prompt

The brief for the Roadmap Builder videos: the product film and the guide videos. Give it, whole, to
whoever records them, a person or an AI agent. It describes what the videos must be; the scripts that
make them are `film/scenes.mjs` and `release/videos.mjs`.

Record only when asked for a candidate or final release build. For ordinary changes to the app, keep the
two scripts able to run and leave the recordings alone.

---

## The prompt

Make the videos for Roadmap Builder from the app as it is in this repository today.

**Product.** Roadmap Builder. Tagline: "Whole programme, one view". Audience: PMO and delivery teams.
Address: https://saharshbishnoi.github.io/roadmap-builder/

**There are two sets of videos.**

1. **The product film**: one narrated tour for the headline of the hosted site. Six chapters, in this
   order: Read the roadmap; Edit in place; Properties; Cards and display; JSON live editor; Share it.
2. **The guide videos**: five short chapters shown in the app's Guide dialog, each recorded twice, once
   in the light theme and once in the dark: Read the roadmap; Add and edit rows; Properties; Cards and
   display; JSON and files.

**Before you start**, compare both scripts with the app. Every feature added since the last recording
gets a step in the chapter where it belongs, in both sets. Every step that names a control that has
moved, been renamed or been removed is corrected. List what you added and changed.

Film the real, running app in a browser with the sample roadmap. No mock-ups, no real names, keys or
customer data.

### Look

- 4K: 3840 x 2160, 30 frames a second, H.264 MP4. Record at that size (a 1920 x 1080 page at 2x for the
  film, a 1280 x 720 page at 3x for the guide videos). Never upscale a smaller recording.
- **Film:** the app sits in a window (rounded corners, soft layered shadow) at about 86% size on a quiet
  near-white gradient backdrop. A chapter card before each chapter: words on the backdrop only, a
  light-weight heading and one line under it. The window sinks away for the card and rises back after
  it. An opening card with the name and tagline, then "The full tour". A closing card with the name and
  one line.
- **Guide videos:** the app fills the frame. Each opens with a title card. The light and dark versions
  show the same steps, and share one narration and one set of subtitles.
- A drawn pointer moves to each control, with a ring on click.
- Professional, eased transitions. Nothing flashy.

### Script and voice

- One spoken line per chapter card and per on-screen step.
- **Write it the way a person would explain it to a colleague.** Full, unhurried sentences that say what
  the feature is for as well as what it does, and why you might want it. A bare run-through of features
  is too abrupt. Roughly 110 to 180 characters a line; two sentences is normal.
- Lead the viewer from one step to the next ("Back at the top…", "Now for the look."), so the tour reads
  as one story and not a list.
- Present tense, plain words, British spelling. Claim only what the picture shows. No superlatives, no
  unmeasured numbers.
- In each step, act first, then say what just happened.
- Voice: an American woman, warm and clear. Kokoro (kokoro-onnx), voice `af_heart`, speed 1.05. Voice
  and speed are settings, not code.
- Keep two spellings where needed: one for the voice to say, one for the subtitles to show (the voice
  says "Jayson"; the subtitles read "JSON").
- Hold each picture for as long as its line takes, plus half a second.
- Small subtitles at the bottom centre, one short phrase at a time, timed to the voice.
- Normalise loudness to about -16 LUFS.

### Approval first

Before recording the whole film, send a 20-second sample of the voice reading the opening lines, still
frames (a chapter card and the app window) and the full script of both sets. Wait for the go-ahead.
Skip this only when told the script is already approved.

### How it is built

- Scripts drive the browser (Puppeteer for the film, Playwright for the guide videos) and ffmpeg
  encodes, so everything can be re-recorded with one command each.
- Scenes and narration stay in one file per set. Refuse to record the film if a scene's line count does
  not match its cards and steps.
- The page's clock is stepped by the recorder, one frame at a time, so every frame is rendered at full
  size and motion is even.
- Wait for things to appear instead of sleeping for fixed times. If the page redraws under a step, find
  the element again and retry.
- If a scene fails, stop, name the scene and the step, and save a screenshot of that moment.
- Cache each spoken line, so re-recording does not speak it again.
- Encode one part per scene and join the parts without re-encoding, so a single chapter can be redone.
- Use all the CPU cores. Run the two recordings at the same time when the machine allows.
- Aim for about a minute and a half per film chapter and about a minute per guide video. The film runs
  to about ten minutes.

### Containerised

- Everything runs in a container: browser, ffmpeg, fonts, the recorder and the voice model. Nothing is
  installed on the machine but Docker.
- One command per set, each writing to a folder on the machine:
  - film: `docker compose -f film/compose.yml run --rm film`
  - guide videos, with the tests, the site and the zip:
    `docker buildx build --build-arg RELEASE=1 --target dist --output type=local,dest=dist .`
- Versions of the base images, browsers, packages and the voice model are pinned, so the same command
  gives the same result later. The voice model is downloaded when the image is built, not on each run.
- No GPU. Run as a non-root user.
- Voice, speed, resolution and which chapters to record are settings passed on the command line.
- If you cannot build or run a container yourself, say so.

### Before you hand it over

- Pull frames from every chapter of both sets, light and dark, and look at them at full size. Check that
  each new feature is on screen in the step that talks about it.
- Check that picture and sound are the same length in every file, and measure loudness.
- List any page errors seen while recording.
- Open the Guide dialog in the app in both themes and confirm it plays the matching set.
- Say plainly what you checked and what you did not, including whether anyone has listened to the voice.

### Deliver

- The film in 4K with chapter markers, a 1080p copy, the subtitles as a separate `.srt`, and a list of
  chapters with their start times.
- Ten guide videos (five chapters, light and dark) with a poster image each and one subtitle file per
  chapter.
- The updated scene files and release notes naming what changed in the videos.
- Then, when asked: publish the site with `./publish-pages.sh`, and push a version tag so the pipeline
  builds the release and attaches the zip and the 4K film.

### Known limits to state in the release notes

- The narration is a synthetic voice.
- In the film, the Guide dialog shows steps without videos, because the film is recorded from a copy of
  the app that has no guide videos beside it.
- Colours in the "Randomise colours" scenes are random, so they differ between the light and dark guide
  videos and from one build to the next.
- GitHub Pages refuses files over 100 MB, so the site plays the film's 1080p copy.
