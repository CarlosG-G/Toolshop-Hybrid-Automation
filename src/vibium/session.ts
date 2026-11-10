import { browser, type Page } from "vibium";

interface BiDiSender {
  send(method: string, params: Record<string, unknown>): Promise<unknown>;
}

function bidiClient(session: object): BiDiSender {
  const client: unknown = Reflect.get(session, "client");
  if (
    typeof client !== "object" ||
    client === null ||
    typeof Reflect.get(client, "send") !== "function"
  ) {
    throw new Error("Vibium session does not expose a WebDriver BiDi client.");
  }
  return client as BiDiSender;
}

/**
 * Starts headless Chrome that reports itself as regular Chrome. The public site's CDN
 * rejects the default "HeadlessChrome" user agent on hosted CI runners; Playwright
 * projects avoid this through the "Desktop Chrome" device profile.
 */
export async function startDesktopChrome() {
  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const page = await session.page();
    const userAgent = String(await page.evaluate("navigator.userAgent"));
    await bidiClient(session).send("emulation.setUserAgentOverride", {
      userAgent: userAgent.replace("HeadlessChrome/", "Chrome/"),
    });
    return session;
  } catch (error) {
    await session.stop();
    throw error;
  }
}

export async function setVibiumDesktopViewport(page: Page): Promise<void> {
  await page.setViewport({ width: 1280, height: 720 });
}
