import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { config } from "../../src/config/env.js";
import { CartPage } from "../../src/pages/cart.page.js";
import { ProductPage } from "../../src/pages/product.page.js";
import { openPaymentStep } from "../support/checkout.js";
import { gates } from "../support/gates.js";
import { markKnownDefect } from "../support/known-defect.js";
import { expect, test } from "./support.js";

interface CriticalViolation {
  id: string;
  target: string;
}

interface ScanTarget {
  id: string;
  name: string;
  open: (page: Page) => Promise<void>;
  knownDefect?: string;
  expectedCritical: CriticalViolation[];
}

function staticPage(path: string, ready: string): (page: Page) => Promise<void> {
  return async (page) => {
    await page.goto(`${config.siteUrl}${path}`);
    await page.locator(ready).first().waitFor({ state: "visible" });
  };
}

const staticPages = [
  {
    id: "TC-A11Y-001",
    name: "home catalog",
    path: "/",
    ready: '[data-test="product-name"]',
    expectedCritical: [],
  },
  {
    id: "TC-A11Y-002",
    name: "login",
    path: "/auth/login",
    ready: '[data-test="email"]',
    knownDefect: "DEF-005 icon-only button without an accessible name",
    expectedCritical: [{ id: "button-name", target: ".btn-outline-secondary" }],
  },
  {
    id: "TC-A11Y-003",
    name: "registration",
    path: "/auth/register",
    ready: '[data-test="first-name"]',
    knownDefect: "DEF-005 icon-only button without an accessible name",
    expectedCritical: [{ id: "button-name", target: ".btn-outline-secondary" }],
  },
  {
    id: "TC-A11Y-004",
    name: "contact",
    path: "/contact",
    ready: '[data-test="contact-submit"]',
    expectedCritical: [],
  },
];

const pages: ScanTarget[] = [
  ...staticPages.map(({ path, ready, ...target }) => ({
    ...target,
    open: staticPage(path, ready),
  })),
  {
    id: "TC-A11Y-005",
    name: "product detail",
    open: async (page) => {
      await new ProductPage(page).openFirstAvailable(config.siteUrl);
    },
    expectedCritical: [],
  },
  {
    id: "TC-A11Y-006",
    name: "cart",
    open: async (page) => {
      const product = new ProductPage(page);
      await product.openFirstAvailable(config.siteUrl);
      await product.addToCart();
      await new CartPage(page).open();
    },
    expectedCritical: [],
  },
  {
    id: "TC-A11Y-007",
    name: "checkout payment step",
    open: async (page) => {
      await openPaymentStep(page);
    },
    expectedCritical: [],
  },
];

test.describe("WCAG 2.1 AA accessibility @a11y @nonfunctional", () => {
  test.beforeEach(gates.writableSut);

  for (const target of pages) {
    test(`${target.id} ${target.name} page has no critical WCAG violations`, async ({
      page,
    }, testInfo) => {
      await target.open(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      await testInfo.attach("axe-results.json", {
        body: JSON.stringify(results.violations, null, 2),
        contentType: "application/json",
      });

      const critical: CriticalViolation[] = results.violations
        .filter((violation) => violation.impact === "critical")
        .flatMap((violation) =>
          violation.nodes.map((node) => ({
            id: violation.id,
            target: node.target.join(" "),
          })),
        );
      markKnownDefect(critical, target.expectedCritical, target.knownDefect);
      expect(critical).toEqual([]);
    });
  }
});
