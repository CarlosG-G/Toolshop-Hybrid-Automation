import type { Page } from "vibium";

export async function setVibiumDesktopViewport(page: Page): Promise<void> {
  await page.setViewport({ width: 1280, height: 720 });
}
