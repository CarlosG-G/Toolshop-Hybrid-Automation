import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const bddDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/features/steps/*.ts",
  outputDir: ".features-gen",
});

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
      testIgnore: [
        "**/api/**",
        "**/contract/**",
        "**/e2e/**",
        "**/security/**",
        "**/nonfunctional/**",
        "**/visual/sut.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "api",
      testMatch: "**/api/**/*.spec.ts",
      grep: /@api/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "contract",
      testMatch: "**/contract/**/*.spec.ts",
      grep: /@contract/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "e2e",
      testMatch: "**/e2e/**/*.spec.ts",
      grep: /@e2e/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "security",
      testMatch: "**/security/**/*.spec.ts",
      grep: /@security/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "nonfunctional",
      testMatch: "**/nonfunctional/**/*.spec.ts",
      grep: /@nonfunctional/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "bdd",
      testDir: bddDir,
      grep: /@bdd/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual-sut",
      testMatch: "**/visual/sut.spec.ts",
      grep: /@visual/,
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
