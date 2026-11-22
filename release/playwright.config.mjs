import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: true,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173", viewport: { width: 1500, height: 900 }, browserName: "chromium" },
  webServer: { command: "node serve.mjs 4173", url: "http://127.0.0.1:4173/", reuseExistingServer: false }
});
