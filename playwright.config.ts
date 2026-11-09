import { defineConfig, devices } from "@playwright/test";

const browserMatrix =
  process.env.TOOLSHOP_BROWSER_MATRIX === "1"
    ? [
        {
          name: "firefox",
          testMatch: ["e2e/**/*.spec.ts", "mocked/**/*.spec.ts"],
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          testMatch: ["e2e/**/*.spec.ts", "mocked/**/*.spec.ts"],
          use: { ...devices["Desktop Safari"] },
        },
      ]
    : [];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    [
      "json",
      { outputFile: process.env.PLAYWRIGHT_JSON_REPORT ?? "reports/playwright.json" },
    ],
  ],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...browserMatrix,
  ],
  webServer: {
    command: "node scripts/mock-shop-server.mjs",
    url: "http://127.0.0.1:4173/health",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
