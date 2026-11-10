import { expect, test, type Page } from "@playwright/test";
import { CheckoutPage } from "../../src/pages/checkout.page.js";

const checkoutHtml = (delayedIndex: number, completeLookup: boolean) => `<!doctype html>
<button data-test="proceed-2">Billing address</button>
<section id="billing" hidden>
  <label for="country">Country</label>
  <select id="country"><option>Austria</option></select>
  <input placeholder="Your Postcode *">
  <input placeholder="e.g. 42 *">
  <input placeholder="Your Street *">
  <input placeholder="Your City *">
  <input placeholder="State *">
  <button data-test="proceed-3">Continue</button>
</section>
<section id="payment" hidden>
  <select data-test="payment-method"><option>Select a method</option></select>
</section>
<output data-test="premature-attempts">0</output>
<script>
  const billing = document.querySelector("#billing");
  const payment = document.querySelector("#payment");
  const address = [
    document.querySelector('[placeholder="Your Street *"]'),
    document.querySelector('[placeholder="Your City *"]'),
    document.querySelector('[placeholder="State *"]')
  ];
  document.querySelector('[data-test="proceed-2"]').addEventListener("click", () => {
    billing.hidden = false;
  });
  document.querySelector('[placeholder="e.g. 42 *"]').addEventListener("input", () => {
    const values = ["Example Street", "Vienna", "Vienna"];
    address.forEach((field, index) => {
      if (index !== ${delayedIndex}) field.value = values[index];
    });
    if (${completeLookup}) {
      setTimeout(() => {
        address[${delayedIndex}].value = values[${delayedIndex}];
      }, 1000);
    }
  });
  document.querySelector('[data-test="proceed-3"]').addEventListener("click", () => {
    if (address.every((field) => field.value.trim())) {
      billing.hidden = true;
      payment.hidden = false;
    } else {
      const attempts = document.querySelector('[data-test="premature-attempts"]');
      attempts.textContent = String(Number(attempts.textContent) + 1);
    }
  });
</script>`;

async function openCheckoutFixture(
  page: Page,
  delayedIndex: number,
  completeLookup = true,
): Promise<void> {
  await page.route("**/checkout-readiness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: checkoutHtml(delayedIndex, completeLookup),
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
