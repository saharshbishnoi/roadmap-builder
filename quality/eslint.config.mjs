// ESLint: the recommended rules, nothing stylistic. The aim is likely mistakes, not house style.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["**/node_modules/**", "app/vendor/**", "app/standalone-template.js", "dist/**", "film/out/**", "film/cache/**"] },
  js.configs.recommended,
  { // the app: plain scripts in the browser
    files: ["app/**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script",
      globals: { ...globals.browser, marked: "readonly", DOMPurify: "readonly", htmlToImage: "readonly", jspdf: "readonly" } }
  },
  { files: ["app/sw.js"], languageOptions: { globals: { ...globals.serviceworker } } },
  { // build, test and recording scripts: Node modules, some of which run code inside a page
    files: ["**/*.mjs"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node, ...globals.browser } }
  }
];
