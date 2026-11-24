# Third-party licences

Roadmap Builder itself is released under the MIT licence (see `LICENSE`). It uses other people's work in
two ways, listed separately below:

1. **Packaged with the app** — files that are served to the browser and so travel with every copy: the
   zip, the hosted site, the container image and the standalone pages the app exports.
2. **Used only to build** — tools that test the app, record the videos and assemble the release. They run
   inside the build containers and are not part of anything that is handed out.

None of this is kept in git. The build fetches it at the pinned versions shown here.

## 1. Packaged with the app

### Libraries (`app/vendor`, pinned in `assets/package.json`)

| Library | Version | Licence | Copyright | Used for |
|---|---|---|---|---|
| [marked](https://github.com/markedjs/marked) | 12.0.2 | MIT | © 2018+ MarkedJS; © 2011–2018 Christopher Jeffrey | Formatting of card and note text |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.5.0 | MPL-2.0 or Apache-2.0 (used here under Apache-2.0) | © Cure53 and other contributors | Making formatted text safe to show |
| [html-to-image](https://github.com/bubkoo/html-to-image) | 1.11.11 | MIT | © 2017–2023 W.Y. | Image export |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | MIT | © 2010–2021 James Hall and contributors; © 2015–2021 yWorks GmbH | PDF export |

The jsPDF file is its published bundle and carries code from other projects inside it (compression,
file saving and Babel helpers among them), each under a permissive licence named in the file's own header.

All four files are used unmodified, and each keeps the licence header its authors put in it.

### Fonts (`app/fonts`, from [Fontsource](https://fontsource.org), pinned in `assets/package.json`)

| Font | Package version | Licence | Copyright |
|---|---|---|---|
| Barlow and Barlow Condensed | 5.3.0 | SIL Open Font License 1.1 | © 2017 The Barlow Project Authors |
| Inter | 5.3.0 | SIL Open Font License 1.1 | © 2016 The Inter Project Authors |
| Open Sans | 5.2.7 | SIL Open Font License 1.1 | © 2020 The Open Sans Project Authors |
| IBM Plex Sans | 5.3.0 | SIL Open Font License 1.1 | © 2019 IBM Corp. |
| Source Sans 3 | 5.3.1 | SIL Open Font License 1.1 | Adobe (as stated in the font files; see the packaged licence text) |

The full licence texts are in `app/fonts/OFL-LICENSE-*.txt` and are packaged beside the fonts. Only the
Latin subsets in the weights the app uses are included.

### The container image

The image that serves the app is built on [nginx](https://nginx.org) 1.27 (BSD 2-Clause) on
[Alpine Linux](https://alpinelinux.org) (packages under their own licences, mostly MIT, BSD and GPL). They
are in the image only; the zip, the hosted site and the standalone pages contain neither.

### What the MIT and Apache licences ask of you

If you pass the app on, keep the licence headers inside the library files, keep
`app/vendor/THIRD-PARTY.txt` and the `OFL-LICENSE` files with it, and include this file or its contents.
A standalone page exported from the app has the libraries and fonts inside it, so the same applies when
you share one widely.

#### MIT licence (marked, html-to-image, jsPDF and the code bundled in it)

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
> associated documentation files (the "Software"), to deal in the Software without restriction, including
> without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
> following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial
> portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
> LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
> NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
> WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
> SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

#### Apache License 2.0 (DOMPurify)

Full text: <https://www.apache.org/licenses/LICENSE-2.0>. DOMPurify is used unmodified.

## 2. Used only to build

These never reach a user of the app. They are listed so that anyone rebuilding the project knows what the
build downloads and runs.

### Tests and guide videos (`Dockerfile`, `release/`)

| Tool | Version | Licence |
|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) and its container image | 1.49.1 | Apache-2.0 |
| Chromium (driven by Playwright) | as shipped with Playwright 1.49.1 | BSD 3-Clause and others |
| [Node.js](https://nodejs.org) | 22 | MIT and others |
| [FFmpeg](https://ffmpeg.org) | from the base image's distribution | LGPL-2.1-or-later / GPL-2.0-or-later, depending on the build |
| Alpine Linux, used to assemble the site and the zip | 3.20 | per package |

### Product film (`film/`)

| Tool | Version | Licence |
|---|---|---|
| [Puppeteer](https://github.com/puppeteer/puppeteer) | 23.11.1 | Apache-2.0 |
| Chrome for Testing | 131.0.6778.204 | Google's terms for Chrome for Testing; Chromium parts BSD 3-Clause and others |
| Node.js on Debian bookworm | 22.12.0 | MIT and others; Debian packages under their own licences |
| FFmpeg | from Debian bookworm | LGPL-2.1-or-later / GPL-2.0-or-later |
| Liberation, DejaVu and Noto fonts (render text in the recording browser) | from Debian bookworm | SIL OFL 1.1; DejaVu under the Bitstream Vera licence |

### Narration voice (both sets of videos)

| Component | Version | Licence |
|---|---|---|
| [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) voice model and voices (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) | 1.0 | Apache-2.0 |
| [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | 0.6.1 | MIT |
| [ONNX Runtime](https://github.com/microsoft/onnxruntime) | 1.32.0 | MIT |
| [NumPy](https://numpy.org) | 2.4.6 | BSD 3-Clause |
| [soundfile](https://github.com/bastibe/python-soundfile) (with libsndfile, LGPL-2.1) | 0.13.1 | BSD 3-Clause |
| [phonemizer](https://github.com/bootphon/phonemizer) | 3.6.0 | GPL-3.0 |
| [espeak-ng](https://github.com/espeak-ng/espeak-ng), through espeakng-loader 0.2.4 | — | GPL-3.0-or-later |
| Smaller Python packages: attrs, cffi, cloudpickle, dlinfo, flatbuffers, joblib, packaging, protobuf, pycparser, typing_extensions | pinned in `film/requirements.txt` | MIT, BSD, Apache-2.0 or PSF |

phonemizer and espeak-ng are GPL programs. They are run, unmodified, inside the build container to turn
the script into speech; they are not copied into the app or into any release file. The recorded narration
is output of those programs, not a copy of them, and the Kokoro model's Apache-2.0 licence allows the
recordings to be used and shared, commercially included.

The videos are encoded as H.264 with AAC sound.

### Quality report (`quality/`)

| Tool | Version | Licence |
|---|---|---|
| [Grype](https://github.com/anchore/grype) and [Syft](https://github.com/anchore/syft) | 0.122.1, 1.57.2 | Apache-2.0 |
| [ESLint](https://eslint.org/), `@eslint/js`, `globals` | 10.15.0, 10.0.1, 17.14.0 | MIT |
| [Stylelint](https://stylelint.io/) and its recommended rules | 18.1.0, 19.1.0 | MIT |
| [html-validate](https://html-validate.org/) | 11.21.1 | MIT |
| [monocart-coverage-reports](https://github.com/cenfun/monocart-coverage-reports) | 3.2.1 | MIT |
| [ShellCheck](https://www.shellcheck.net/) | 0.11.0 | GPL-3.0 |
| [Hadolint](https://github.com/hadolint/hadolint) | 2.15.1 | GPL-3.0 |
| [Ruff](https://docs.astral.sh/ruff/) | 0.17.6 | MIT |

These run inside the quality build and only read the code; none is copied into the app or a release file.
The report they produce is attached to a release as its own zip.

### Desktop scaffold (`desktop/`, not built or released)

[Tauri](https://tauri.app) 2 (MIT or Apache-2.0) and the Rust crates it brings in. Nothing from it is in
any release.

## Keeping this file right

Versions are pinned in `assets/package.json`, `release/package.json`, `film/package.json`,
`film/requirements.txt` and the two Dockerfiles. When one of those changes, change this file in the same
commit. Licences named here were taken from each project's own statement at the pinned version; this is a
record for convenience, not legal advice.
