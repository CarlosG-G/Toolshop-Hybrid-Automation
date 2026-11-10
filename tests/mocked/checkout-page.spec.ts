import { expect, test, type Page } from "@playwright/test";
import { CheckoutPage } from "../../src/pages/checkout.page.js";

const checkoutHtml = (
  delayedIndex: number,
  completeLookup: boolean,
  debounceMs: number,
) => `<!doctype html>
<button data-test="proceed-2">Billing address</button>
<form id="billing" class="ng-valid" hidden>
  <label for="country">Country</label>
  <select id="country"><option value="AT">Austria</option></select>
  <input placeholder="Your Postcode *">
  <input placeholder="e.g. 42 *">
  <input placeholder="Your Street *">
  <input placeholder="Your City *">
  <input placeholder="State *">
  <button type="button" data-test="proceed-3">Continue</button>
</form>
<section id="payment" hidden>
  <select data-test="payment-method"><option>Select a method</option></select>
</section>
<output data-test="premature-attempts">0</output>
<output data-test="lookup-error"></output>
<script>
  const billing = document.querySelector("#billing");
  const payment = document.querySelector("#payment");
  const address = [
    document.querySelector('[placeholder="Your Street *"]'),
    document.querySelector('[placeholder="Your City *"]'),
    document.querySelector('[placeholder="State *"]')
  ];
  const postcode = document.querySelector('[placeholder="Your Postcode *"]');
  const house = document.querySelector('[placeholder="e.g. 42 *"]');
  const lookupError = document.querySelector('[data-test="lookup-error"]');
  let scheduledLookups = 0;
  let pendingLookups = 0;
  const lookup = async () => {
    if (!postcode.value || !house.value) return;
    const query = new URLSearchParams({
      country: "AT", postcode: postcode.value, house_number: house.value
    });
    pendingLookups += 1;
    try {
      const response = await fetch("/postcode-lookup?" + query);
      if (!response.ok) {
        lookupError.textContent = "HTTP " + response.status;
        return;
      }
      const result = await response.json();
      const values = [result.street, result.city, result.state];
      address.forEach((field, index) => {
        if (index !== ${delayedIndex}) field.value = values[index];
      });
      if (${completeLookup} && ${delayedIndex} >= 0) {
        setTimeout(() => {
          address[${delayedIndex}].value = values[${delayedIndex}];
        }, 1000);
      }
    } catch (error) {
      lookupError.textContent = String(error);
    } finally {
      pendingLookups -= 1;
    }
  };
  document.querySelector('[data-test="proceed-2"]').addEventListener("click", () => {
    billing.hidden = false;
  });
  const scheduleLookup = () => {
    scheduledLookups += 1;
    setTimeout(() => {
      scheduledLookups -= 1;
      void lookup();
    }, ${debounceMs});
  };
  postcode.addEventListener("input", scheduleLookup);
  house.addEventListener("input", scheduleLookup);
  document.querySelector('[data-test="proceed-3"]').addEventListener("click", () => {
    if (scheduledLookups || pendingLookups) {
      const attempts = document.querySelector('[data-test="premature-attempts"]');
      attempts.textContent = String(Number(attempts.textContent) + 1);
    }
    if (address.every((field) => field.value.trim())) {
      billing.hidden = true;
      payment.hidden = false;
    }
  });
</script>`;

async function openCheckoutFixture(
  page: Page,
  delayedIndex: number,
  completeLookup = true,
  debounceMs = 300,
): Promise<void> {
  await page.route("**/postcode-lookup**", (route) =>
    route.fulfill({
      json: { street: "Example Street", city: "Vienna", state: "Vienna" },
    }),
  );
  await page.route("**/checkout-readiness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: checkoutHtml(delayedIndex, completeLookup, debounceMs),
    }),
  );
  await page.goto("http://127.0.0.1:4173/checkout-readiness");
}

for (const [index, field] of ["street", "city", "state"].entries()) {
  test(`waits for ${field} autofill before continuing to payment`, async ({ page }) => {
    await openCheckoutFixture(page, index);

    const checkout = new CheckoutPage(page);
    await checkout.continueToPayment();

    await expect(checkout.paymentMethod()).toBeVisible();
    await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
  });
}

test("reports an incomplete address lookup without advancing", async ({ page }) => {
  await openCheckoutFixture(page, 2, false);

  const checkout = new CheckoutPage(page, 700);
  await expect(checkout.continueToPayment()).rejects.toThrow(/State/);

  await expect(checkout.paymentMethod()).toBeHidden();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
});

test("waits for both debounced address lookups before advancing", async ({ page }) => {
  await openCheckoutFixture(page, -1);
  let lookups = 0;
  await page.route("**/postcode-lookup**", async (route) => {
    lookups += 1;
    if (lookups === 2) await new Promise((resolve) => setTimeout(resolve, 750));
    await route.fulfill({
      json: { street: "Example Street", city: "Vienna", state: "Vienna" },
    });
  });

  const checkout = new CheckoutPage(page);
  await checkout.continueToPayment();

  expect(lookups).toBe(2);
  await expect(checkout.paymentMethod()).toBeVisible();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
});

test("waits for lookups that finish in reverse order", async ({ page }) => {
  await openCheckoutFixture(page, -1);
  let lookups = 0;
  await page.route("**/postcode-lookup**", async (route) => {
    const sequence = ++lookups;
    if (sequence === 1) await new Promise((resolve) => setTimeout(resolve, 750));
    await route.fulfill({
      json:
        sequence === 1
          ? { street: "Last Street", city: "Graz", state: "Styria" }
          : { street: "First Street", city: "Vienna", state: "Vienna" },
    });
  });

  const checkout = new CheckoutPage(page);
  await checkout.continueToPayment();

  expect(lookups).toBe(2);
  await expect(page.getByPlaceholder("Your Street *")).toHaveValue("Last Street");
  await expect(checkout.paymentMethod()).toBeVisible();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
});

test("waits for a lookup that starts shortly after the debounce window", async ({
  page,
}) => {
  await openCheckoutFixture(page, -1, true, 350);

  const checkout = new CheckoutPage(page, 1_000);
  await checkout.continueToPayment();

  await expect(checkout.paymentMethod()).toBeVisible();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
});

test("reports a lookup that never starts within the timeout", async ({ page }) => {
  await openCheckoutFixture(page, -1, true, 2_000);

  const checkout = new CheckoutPage(page, 500);
  await expect(checkout.continueToPayment()).rejects.toThrow(
    /Timed out waiting for postcode lookup to start/,
  );

  await expect(checkout.paymentMethod()).toBeHidden();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
});

test("reports a lookup that does not finish within the timeout", async ({ page }) => {
  await openCheckoutFixture(page, -1);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/postcode-lookup**", async (route) => {
    await gate;
    await route.fulfill({
      json: { street: "Example Street", city: "Vienna", state: "Vienna" },
    });
  });

  try {
    const checkout = new CheckoutPage(page, 500);
    await expect(checkout.continueToPayment()).rejects.toThrow(
      /Timed out waiting for postcode lookups to finish/,
    );
    await expect(checkout.paymentMethod()).toBeHidden();
    await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("reports an incomplete postcode response without advancing", async ({ page }) => {
  await openCheckoutFixture(page, -1);
  await page.route("**/postcode-lookup**", (route) =>
    route.fulfill({ json: { street: "Example Street", city: "Vienna", state: "" } }),
  );

  const checkout = new CheckoutPage(page, 1_000);
  await expect(checkout.continueToPayment()).rejects.toThrow(
    /incomplete billing address/,
  );
  await expect(checkout.paymentMethod()).toBeHidden();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
});

test("reports a failed postcode lookup without advancing", async ({ page }) => {
  await openCheckoutFixture(page, -1);
  await page.route("**/postcode-lookup**", (route) =>
    route.fulfill({ status: 503, json: { error: "Lookup unavailable" } }),
  );

  const checkout = new CheckoutPage(page, 1_000);
  await expect(checkout.continueToPayment()).rejects.toThrow(/HTTP 503/);

  await expect(checkout.paymentMethod()).toBeHidden();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
  await expect(page.locator('[data-test="lookup-error"]')).toHaveText("HTTP 503");
});

test("reports an unreachable postcode lookup without advancing", async ({ page }) => {
  await openCheckoutFixture(page, -1);
  await page.route("**/postcode-lookup**", (route) => route.abort("failed"));

  const checkout = new CheckoutPage(page, 1_000);
  await expect(checkout.continueToPayment()).rejects.toThrow(/Postcode lookup failed:/);

  await expect(checkout.paymentMethod()).toBeHidden();
  await expect(page.locator('[data-test="premature-attempts"]')).toHaveText("0");
  await expect(page.locator('[data-test="lookup-error"]')).toHaveText(/\S/);
});
