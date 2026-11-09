import { AxeBuilder } from "@axe-core/playwright";
import { config } from "../../src/config/env.js";
import { expect, requiresLocalUi, test } from "./support.js";

const pages = [
  {
    id: "TC-A11Y-001",
    name: "home catalog",
    path: "/",
    ready: '[data-test="product-name"]',
  },
  {
    id: "TC-A11Y-002",
    name: "login",
    path: "/auth/login",
    ready: '[data-test="email"]',
    knownDefect: "DEF-005 icon-only button without an accessible name",
  },
  {
    id: "TC-A11Y-003",
    name: "registration",
    path: "/auth/register",
    ready: '[data-test="first-name"]',
    knownDefect: "DEF-005 icon-only button without an accessible name",
  },
  {
    id: "TC-A11Y-004",
    name: "contact",
    path: "/contact",
    ready: '[data-test="contact-submit"]',
  },
];

test.describe("WCAG 2.1 AA accessibility @a11y @nonfunctional", () => {
  test.beforeEach(requiresLocalUi);

  for (const target of pages) {
    test(`${target.id} ${target.name} page has no critical WCAG violations`, async ({
      page,
    }, testInfo) => {
      test.fail(Boolean(target.knownDefect), target.knownDefect);
      await page.goto(`${config.siteUrl}${target.path}`);
      await page.locator(target.ready).first().waitFor({ state: "visible" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      await testInfo.attach("axe-results.json", {
        body: JSON.stringify(results.violations, null, 2),
        contentType: "application/json",
      });

      const critical = results.violations
        .filter((violation) => violation.impact === "critical")
        .map(
          (violation) =>
            `${violation.id}: ${violation.help} -> ${violation.nodes
              .map((node) => node.target.join(" "))
              .join(", ")}`,
        );
      expect(critical).toEqual([]);
    });
  }
});
