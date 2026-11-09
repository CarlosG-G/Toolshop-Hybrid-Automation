import { expect, test } from "@playwright/test";
import { CartPage } from "../../src/pages/cart.page.js";
import { CheckoutPage } from "../../src/pages/checkout.page.js";
import { LoginPage } from "../../src/pages/login.page.js";
import { ProductPage } from "../../src/pages/product.page.js";
import { config } from "../../src/config/env.js";

const customer = {
  email: "customer@practicesoftwaretesting.com",
  password: "welcome01",
};

test.describe("Authenticated checkout journey @e2e @smoke", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.TOOLSHOP_LIVE !== "1" || !config.allowsWrites,
      "The checkout journey only runs against the disposable local SUT.",
    );
  });

  test("TC-E2E-001 signs in, adds a product to the cart and reaches payment selection", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.open(config.siteUrl);
    await login.signIn(customer.email, customer.password);

    const product = new ProductPage(page);
    const productName = await product.openFirstAvailable(config.siteUrl);
    await product.addToCart();

    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.productTitle(productName)).toBeVisible();
    await cart.proceedToCheckout();

    const checkout = new CheckoutPage(page);
    await checkout.waitForAddressStep();
    await checkout.continueToPayment();
    await expect(checkout.paymentMethod()).toBeVisible();
    await checkout.selectPaymentMethod("cash-on-delivery");
    await expect(checkout.paymentMethod()).toHaveValue("cash-on-delivery");
  });
});
