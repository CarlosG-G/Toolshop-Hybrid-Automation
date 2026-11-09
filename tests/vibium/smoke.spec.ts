import { expect, test } from "@playwright/test";
import { browser } from "vibium";
import { config } from "../../src/config/env.js";
import { findSemanticHeadings } from "../../src/vibium/semantic.js";

test("WB-01: Vibium checks the accessible catalog heading", async () => {
  test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live Vibium suite is opt-in.");

  const session = await browser.start({ engine: "chrome", headless: true });
  try {
    const page = await session.page();
    await page.go(config.siteUrl);
    const headings = await findSemanticHeadings(
      page,
      "Practice Software Testing - Toolshop",
    );

    // oxlint-disable-next-line playwright/no-conditional-in-test -- the with-bugs target intentionally breaks the catalog heading
    if (config.target === "with-bugs") {
      expect(headings).toHaveLength(0);
      return;
    }

    expect(headings).toHaveLength(1);
    const heading = headings[0];
    expect(await heading.role()).toBe("heading");
    expect(await heading.text()).toContain("Toolshop");
  } finally {
    await session.stop();
  }
});
