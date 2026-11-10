import { devices } from "@playwright/test";
import { browser, type Page } from "vibium";

/**
 * Starts headless Chrome with the desktop Chrome user agent used by the Playwright
 * projects. The public site's CDN rejects the default "HeadlessChrome" agent on
 * hosted CI runners.
 */
export function startDesktopChrome() {
  return browser.start({
    engine: "chrome",
    headless: true,
    headers: { "User-Agent": devices["Desktop Chrome"].userAgent },
  });
}

export async function setVibiumDesktopViewport(page: Page): Promise<void> {
  await page.setViewport({ width: 1280, height: 720 });
}
