# Testing

How Roadmap Builder is tested, how to run the tests, how to add one, and what is not tested yet. Links to
the Playwright documentation are given where they help.

## 1. What there is

| Kind | Where | Tool | When it runs |
|---|---|---|---|
| Browser tests of the app | `release/tests/app.spec.mjs` (51 tests) | [Playwright Test](https://playwright.dev/docs/intro), headless Chromium | Every release build and every tagged release; on demand locally |
| Guide videos as a check | `release/videos.mjs` | [Playwright library](https://playwright.dev/docs/library) | Every release build. It drives the real app through every chapter and stops if a control is missing |
| Product film as a check | `film/scenes.mjs`, `film/record.mjs` | [Puppeteer](https://pptr.dev/) | When the film is recorded. It stops at the scene and step that failed, saves a screenshot in `film/out/failures`, and lists page errors in `film/out/report.json` |
| Build checks | `assets/standalone.mjs`, `Dockerfile` | Node, sha256sum | Every build: the standalone template checks itself, and the voice model is checked against pinned checksums |

There are no unit tests. The app is one page with no build step, so everything is tested the way a person
uses it: in a browser, through the page.

The tests are the gate for a release. In the `Dockerfile` the `release-1` stage runs `npx playwright test`
before anything else; if one test fails, the build stops, no videos are made, and the pipeline creates no
release.

## 2. Running the tests

Everything runs in Docker. Nothing needs installing on the machine.

**As part of a release build** (tests, then guide videos, site and zip):

```
docker buildx build --build-arg RELEASE=1 --target dist --output type=local,dest=dist .
```

**On their own, against the working copy** (seconds, not minutes). Build the tools image once:

```
docker build --target tools -t rb-tools .
```

Regenerate the standalone template, which the export tests need:

```
docker run --rm -v "$PWD/app:/site" -v "$PWD/assets:/assets:ro" rb-tools sh -c 'node /assets/standalone.mjs /site /site/standalone-template.js'
```

Run all the tests:

```
docker run --rm -v "$PWD/app:/work/app:ro" -v "$PWD/release/tests:/work/release/tests:ro" -v "$PWD/release/serve.mjs:/work/release/serve.mjs:ro" -v "$PWD/release/playwright.config.mjs:/work/release/playwright.config.mjs:ro" rb-tools sh -c 'npx playwright test'
```

Run some of them: replace the last part with `npx playwright test -g "Guide"` to run tests whose title
contains a word, or add `--repeat-each=5` to run each several times when checking for a test that only
sometimes fails. See the [command line reference](https://playwright.dev/docs/test-cli).

The local run needs `app/vendor` and `app/fonts` to be filled in, which any ordinary build does
(`docker compose up -d --build`).

**In the pipeline.** Pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, whose first step is the
release build above. The test output is in that step's log on the Actions tab of the repository. See
[Playwright on CI](https://playwright.dev/docs/ci) and
[GitHub Actions workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions).

## 3. How the tests are set up

`release/playwright.config.mjs` ([configuration reference](https://playwright.dev/docs/test-configuration)):

| Setting | Value | Why |
|---|---|---|
| Browser | Chromium only | The only browser the app is tested in |
| Window | 1500 x 900 | Wide enough for both side panels |
| Time limit | 30 seconds a test | |
| `fullyParallel` | on | Each test gets a fresh page and empty storage, so they do not affect each other ([isolation](https://playwright.dev/docs/browser-contexts)) |
| `forbidOnly` | on | A stray `test.only` fails the run |
| Web server | `node serve.mjs 4173` | A small static server for `app/`, started by Playwright ([web server](https://playwright.dev/docs/test-webserver)) |
| Retries | none | A test that fails once fails the build |

The browser and Playwright come from the pinned image `mcr.microsoft.com/playwright:v1.49.1-noble`
([Playwright in Docker](https://playwright.dev/docs/docker)).

Helpers at the top of `app.spec.mjs`:

- `open(page, "edit")` loads the app, waits for the first row and optionally switches to Edit.
- `state(page)` returns a copy of the roadmap through `window.__roadmap.state`, so a test can check what
  changed without reading the screen.
- `settle(page)` waits for bars and columns to finish gliding.
- `dragBy(page, selector, dx, dy)` drags something with the mouse.
- Every test collects page errors and console errors as it runs, and fails at the end if there were any.

## 4. What the tests cover

| Area | What is checked |
|---|---|
| Reading | The sample loads in View; hover card moves and resets; the pointer line; headings not in capitals; square and rounded cards, with the dialog's accent strip staying square |
| Editing rows | Add row and add workstream; dates typed in columns; one-date bars fade; hidden rows dim in Edit and vanish in View; headings edited in place; Start and End columns shown and hidden; chips beside bars |
| Bars and timeline | Drag to move with Undo; delete with Undo; column resize; year-scale drag and double-click to fit; fit the timeline to a row; right-click menus |
| Properties | Item settings with the caret kept while typing; label and date sizes; header size, font and date chip; Cards heading renamed; timeline years; Randomise colours with Undo; light / dark from the toolbar |
| Cards | A pinned floating card follows its row; a free one stays put |
| JSON editor | Live edits; invalid text refused with its line named; line numbers; format on save; cards listed and edited |
| Files | CSV round trip; an older roadmap file brought up to date; image of this view and of the whole timeline |
| Standalone pages | One self-contained file that opens from a folder; view-only opens exactly as exported and cannot be edited |
| Layout | The schedule fills the window and scrolls inside itself; side panels are full height |
| Guide and hosting | Guide opens as a large dialog at the top with seven chapters, and plays the videos of the app's theme where they exist; installable (manifest, icon, offline helper); works from a folder; the film headline stays hidden where the film is not published |

## 5. Writing a test

Add a test for anything a user can see or do. Keep these habits:

1. **Name it as a sentence a user would recognise**: "the last add row creates a workstream".
2. **Act through the page, check through the page or `state(page)`.** Do not reach into the app's
   internals.
3. **Use assertions that wait.** `await expect(locator).toHaveText(...)` retries until it is true or times
   out ([auto-retrying assertions](https://playwright.dev/docs/test-assertions)). A plain
   `expect(value)` on something read once does not.
4. **Anything that moves needs waiting for.** Bars, panels and dialogs animate. Measure after `settle()`,
   or poll: `await expect.poll(async () => (await box.boundingBox()).y).toBeLessThan(30)`
   ([polling](https://playwright.dev/docs/test-assertions#expectpoll)). The v1.4.2 release build failed
   on exactly this: a dialog measured once, mid-animation, on a slower machine.
5. **Prefer ids and roles to positions.** Controls have stable ids (`#modeEdit`, `#propBtn`, `#helpBtn`);
   see [locators](https://playwright.dev/docs/locators).
6. **Each test starts clean** and must not depend on another having run.
7. **Things made by a release build are optional in a test.** The guide videos do not exist in an ordinary
   working copy, so a test checks them only "where they exist".

Further reading: [writing tests](https://playwright.dev/docs/writing-tests),
[best practices](https://playwright.dev/docs/best-practices),
[actionability](https://playwright.dev/docs/actionability) (what Playwright waits for before a click).

## 6. When a test fails

- **Read the list output first.** It gives the test, the line, and expected against received.
- **Locally**, run only that test with `-g`, and add `--repeat-each=10` if it fails only sometimes.
- **In the pipeline**, open the failed step's log on the Actions tab. The log needs a GitHub sign-in.
- **A failure only in the pipeline** usually means timing: the machine is slower, so an animation or a
  redraw had not finished. Make the test wait for the state; do not lengthen a fixed pause, and do not
  switch on retries to hide it.
- Tools that would help but are **not set up here**: the
  [trace viewer](https://playwright.dev/docs/trace-viewer), screenshots and video on failure
  ([options](https://playwright.dev/docs/test-use-options#recording-options)), and the
  [HTML report](https://playwright.dev/docs/test-reporters#html-reporter). See section 9.

## 7. Automation beyond the tests

- **Guide videos** (`release/videos.mjs`) use the Playwright library with a stepped clock
  ([clock](https://playwright.dev/docs/clock)) and Chrome's screenshot command, one frame at a time. A
  scene that cannot find its control fails the release build, so the videos double as an end-to-end run
  through every chapter in both themes.
- **Product film** (`film/record.mjs`) uses Puppeteer ([guides](https://pptr.dev/category/guides)) with
  its own clock, waits for elements instead of sleeping, and retries when the page redraws under a step.
- **Release pipeline** (`.github/workflows/release.yml`): build with tests, record the film, package,
  create the release. Triggered by a version tag or by hand.
- **Hooks for scripts**: `window.__roadmap.state`, `.importText(name, text)` and `.toCSV()`; see
  `docs/DEVELOPMENT.md`.

## 8. The quality report

`./quality/run.sh` makes `dist/quality/index.html`: known vulnerabilities and an inventory of what is
packaged, static analysis, and how much of the app the browser tests run, gathered into one page of
figures. It reports only and never fails a build. See `quality/README.md`.

## 9. What is not tested, and improvements worth making

Known gaps, for review:

| Gap | Why it matters | A way to close it |
|---|---|---|
| Tests run only on a release build or a tag | A broken test is found late, as with v1.4.2 | A second workflow that runs only the tests on every push to `main` (a few minutes) |
| No trace or screenshot kept on failure | A pipeline failure has to be read from text | `trace: "retain-on-failure"` in the config, and upload `test-results` as an artifact ([trace viewer](https://playwright.dev/docs/trace-viewer)) |
| Chromium only | Firefox and Safari are untested | Add projects for Firefox and WebKit ([browsers](https://playwright.dev/docs/browsers), [projects](https://playwright.dev/docs/test-projects)) |
| No phone or small-screen run | The layout below 1000 px is unchecked | A project with a phone viewport ([emulation](https://playwright.dev/docs/emulation)) |
| No accessibility checks | Keyboard use and contrast are unchecked | [Accessibility testing](https://playwright.dev/docs/accessibility-testing) with axe |
| No picture comparison | A visual regression in the chart passes the tests | [Visual comparisons](https://playwright.dev/docs/test-snapshots) of a few fixed views, in both themes |
| PDF export is not opened and checked | Only the image exports are measured | Check the page count and size of the saved file |
| The hosted site is not tested after publishing | A bad publish is found by a visitor | A short smoke test against the Pages address after `publish-pages.sh` |
| The desktop scaffold is never built | Unknown whether it works | Out of scope until it is built |
| Nobody listens to the narration | Mispronunciations go out unnoticed | A person listens to each release candidate |
| Fixed pauses (`settle`, 450 ms) | Slow machines can still outrun them | Replace with waits on the state, as in section 5 |

None of these are done. Say which you want and they can be added one at a time.
