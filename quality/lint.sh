#!/bin/sh
# Static analysis. Every tool writes JSON into /report/raw and none of them can fail the build.
set -u
R=/report/raw; mkdir -p "$R"; cd /src || exit 1
run() { name=$1; shift; "$@" > "$R/$name.json" 2> "$R/$name.err"; echo "$name: exit $?" | tee -a "$R/lint.log"; }

JS="app/app.js app/guide.js app/sw.js assets release film quality"
run eslint     /q/node_modules/.bin/eslint --config /q/eslint.config.mjs --format json --no-warn-ignored $JS
run stylelint  /q/node_modules/.bin/stylelint --config /q/stylelint.config.mjs --config-basedir /q --formatter json "app/styles.css"
run html       /q/node_modules/.bin/html-validate --config /q/htmlvalidate.json --formatter json app/index.html film/stage.html
run shellcheck sh -c 'shellcheck -f json $(find . -name "*.sh" -not -path "*/node_modules/*" | sort)'
run hadolint   sh -c 'hadolint -f json Dockerfile film/Dockerfile quality/Dockerfile'
run ruff       sh -c 'ruff check --no-cache --output-format json $(find . -name "*.py" -not -path "*/node_modules/*" | sort)'
# stylelint 16+ writes its JSON to stderr when there are findings; keep whichever stream has it.
[ -s "$R/stylelint.json" ] || cp "$R/stylelint.err" "$R/stylelint.json"
{ echo "eslint $(/q/node_modules/.bin/eslint --version)"; echo "stylelint $(/q/node_modules/.bin/stylelint --version)"; echo "html-validate $(/q/node_modules/.bin/html-validate --version)";
  shellcheck --version | sed -n 2p; hadolint --version; ruff --version; } > "$R/lint.versions" 2>&1
ls -la "$R"
exit 0
