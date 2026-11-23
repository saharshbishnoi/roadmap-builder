// A wrapper around Playwright's test: the same tests, with Chromium's coverage switched on for each page.
// The copy of the tests made in quality/Dockerfile imports "test" and "expect" from here.
import { test as base, expect } from "@playwright/test";
import MCR from "monocart-coverage-reports";
import options from "./mcr.options.mjs";

export const test = base.extend({
  coverage: [async ({ page }, use) => {
    await Promise.all([
      page.coverage.startJSCoverage({ resetOnNavigation: false }),
      page.coverage.startCSSCoverage({ resetOnNavigation: false })
    ]);
    await use(true);
    let list = [];
    try { const [js, css] = await Promise.all([page.coverage.stopJSCoverage(), page.coverage.stopCSSCoverage()]); list = [...js, ...css]; }
    catch { /* the test closed its page: nothing to add */ }
    if (list.length) await MCR(options).add(list);
  }, { auto: true }]
});
export { expect };
