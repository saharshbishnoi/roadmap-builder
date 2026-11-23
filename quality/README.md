# Quality report

One command makes a page of figures about the state of the code:

```
./quality/run.sh
```

It writes `dist/quality/`. Open `dist/quality/index.html`. A run takes about a minute once Docker has the
tools; the first run downloads them.

**It reports only.** A finding never fails the command, a build or a release. It is kept apart from the
app: everything is in this folder, with its own Dockerfile, and it changes nothing in `app/`, the tests or
the main `Dockerfile`.

## What it measures

| Part | Tool | What you get |
|---|---|---|
| Known vulnerabilities (CVEs) | [Grype](https://github.com/anchore/grype) | Advisories that match a package and version, by severity, with the version that fixes each |
| Inventory | [Syft](https://github.com/anchore/syft) | A list of every component, in CycloneDX form (`sbom/*.cdx.json`) |
| JavaScript | [ESLint](https://eslint.org/), recommended rules | Likely mistakes: unused code, empty blocks, needless escapes |
| Stylesheet | [Stylelint](https://stylelint.io/), recommended rules | Invalid or contradictory CSS |
| Page markup | [html-validate](https://html-validate.org/) | Invalid HTML and accessibility slips |
| Shell scripts | [ShellCheck](https://www.shellcheck.net/) | Quoting and portability problems |
| Dockerfiles | [Hadolint](https://github.com/hadolint/hadolint) | Unpinned packages and risky build steps |
| Python | [Ruff](https://docs.astral.sh/ruff/) | Likely mistakes in the narration scripts |
| Test coverage | Chromium's own coverage through [Playwright](https://playwright.dev/docs/api/class-coverage), reported by [monocart-coverage-reports](https://github.com/cenfun/monocart-coverage-reports) | Which functions, branches and statements of `app.js`, and how much of `styles.css`, the browser tests run |

Vulnerabilities and the inventory are reported in three groups, kept apart because they matter differently:

1. **Packaged with the app**: the libraries and fonts served to the browser. These reach every user.
2. **The image that serves it**: nginx on Alpine. Only the container is affected; the zip, the hosted site
   and standalone pages contain none of it.
3. **Used only to build**: recording and quality tools. Never handed to a user.

## What comes out

| File | What it is |
|---|---|
| `index.html` | The figures and the findings behind them, on one page, light or dark to match the computer |
| `SUMMARY.md` | The figures on half a page; also printed at the end of the run |
| `kpis.json` | Every figure, for comparing one run with the next |
| `coverage/index.html` | Line-by-line coverage: exactly which code no test reaches |
| `sbom/*.cdx.json` | The three inventories |
| `raw/` | Each tool's own output, untouched |

## How it works

`quality/Dockerfile` is built with the repository root as its context and its own ignore file
(`Dockerfile.dockerignore`). Its stages:

1. `scan`: Grype and Syft over the lock files and the serving image (`scan.sh`).
2. `lint`: the six linters, with the settings in this folder (`lint.sh`).
3. `coverage`: the browser tests again, with coverage switched on. The tests in `release/tests` are used
   as they are; only the copy inside the build has its import pointed at `coverage/fixture.mjs`.
4. `report`: `report.mjs` turns the raw results into the three files above.

The vulnerability database changes daily, so `run.sh` passes today's date to the build; Docker then runs
the scan again each day and reuses everything else.

Tools are pinned: images by digest in the Dockerfile, Node packages by `package-lock.json`.

## In a release

The release pipeline runs it after the film is recorded and attaches
`roadmap-builder-quality-report.zip` to the GitHub release. The step is marked so that a failure of the
report cannot stop the release.

## What it does not tell you

- Coverage says which code the tests ran, not whether the checks are good.
- A listed vulnerability means an advisory matches a package and version. Whether the app uses the affected
  part has not been assessed.
- The shipped group is read from the lock file, so it includes packages that a library lists but the app
  never serves (for example an older DOMPurify that jsPDF names as optional). Check a finding against
  `app/vendor` before acting on it.
- The vulnerability figures are as of the database date and change without any change to the code.
- `release/package.json` has no lock file, so the test runner's packages are not in the scan.
- The linters use recommended rules only; they do not judge how the roadmap behaves.

## Changing it

- Rules: `eslint.config.mjs`, `stylelint.config.mjs`, `htmlvalidate.json`.
- What counts for coverage: `coverage/mcr.options.mjs`.
- To make a finding stop the build later, add the check to the end of `report.mjs` and exit with an error
  there; nothing does so today.
- When a tool version changes, update its digest or `package.json`, and `THIRD-PARTY-LICENSES.md`.
