# The Roadmap Builder product film

A narrated tour of the real app, recorded by a script so it can be made again with one command.
Everything runs in a container: the browser, ffmpeg, fonts, the recorder and the voice model. The only
thing needed on the machine is Docker.

## Record it

```
docker compose -f film/compose.yml run --rm film
```

The film is written to `film/out`:

| File | What it is |
|---|---|
| `roadmap-builder-film-4k.mp4` | The film: 3840 x 2160, 30 frames a second, H.264, with chapter markers |
| `roadmap-builder-film-1080p.mp4` | A smaller copy for sharing |
| `roadmap-builder-film.srt` | Subtitles (also `.vtt` for web pages) |
| `chapters.txt` | Chapters and their start times |
| `roadmap-builder-film-poster.jpg` | A still for the player |
| `report.json` | Size, lengths of picture and sound, measured loudness, and any page errors seen while recording |
| `parts/` | One part per scene; the film is these joined without re-encoding |

Sign-off pack before recording (the script, a 20-second voice sample and stills):

```
docker compose -f film/compose.yml run --rm film approval
```

## Settings

Pass these on the command line; no files need editing.

| Setting | Default | Meaning |
|---|---|---|
| `FILM_VOICE` | `af_heart` | Kokoro voice |
| `FILM_SPEED` | `1.05` | Speaking speed |
| `FILM_WIDTH`, `FILM_HEIGHT` | `1920`, `1080` | Page size |
| `FILM_SCALE` | `2` | Pixel density; page size times this is the film size (3840 x 2160) |
| `FILM_FPS` | `30` | Frames a second |
| `FILM_CHAPTERS` | `all` | Which scenes to record: `all`, `opening`, `closing`, a chapter number, or a scene id; comma-separated |
| `FILM_JOBS` | half the CPU cores | Scenes recorded at once |
| `FILM_UID`, `FILM_GID` | `1000` | The user the container runs as; set these to your own ids if they differ, so the output files are yours |

Re-record one chapter and join the film again:

```
FILM_CHAPTERS=3 docker compose -f film/compose.yml run --rm film
```

Spoken lines are kept in `film/cache`, so a line is only spoken again if its words, the voice or the
speed change.

## Changing the film

`scenes.mjs` holds every scene: its cards, its steps and its spoken lines, in one place. There must be
exactly one line per card and one per step; the recorder refuses to start otherwise. A line can carry
two spellings, one for the voice and one for the subtitles:

```js
{ say: "Open the Jayson tab.", show: "Open the JSON tab." }
```

In a step the action happens first; the line then says what just happened, and the picture holds for
the length of the line plus half a second.

If a scene fails, the recorder stops, names the scene and the step, and saves a screenshot of that
moment in `film/out/failures`.

## How it works

- `record.mjs` drives Chrome with Puppeteer. The app runs in a window on `stage.html`, which also draws
  the backdrop, the chapter cards, the pointer and the subtitles.
- The page's clock is stepped by the recorder, one frame at a time, so every frame is rendered at full
  size and motion is even. Steps wait for things to appear rather than for fixed times, and look again
  if the page redraws.
- `speak.py` speaks the lines with Kokoro. Loudness is normalised to about -16 LUFS.
- Each scene is encoded as its own part; parts are joined without re-encoding.

## What is pinned

The base image (by digest), Chrome for Testing (through the Puppeteer version in `package-lock.json`),
the Python packages (`requirements.txt`) and the voice model (by checksum, downloaded when the image is
built). ffmpeg and system fonts come from the Debian release of the base image.

The container runs as a non-root user and needs no GPU. Chrome runs with its own sandbox switched off,
which is usual inside a container; it only ever opens the app served from inside the same container.

## Where the film is shown

Only on the hosted site. `./publish-pages.sh` (in the repository root) copies the film from `film/out`
into the site it pushes to the `gh-pages` branch, so the film is not in the zip, the container image
or a standalone page. The app shows its "Watch the tour" bar only when it finds the film beside it.
GitHub refuses files over 100 MB, so the site plays the 1080p copy and the 4K master stays here.
