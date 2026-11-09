import { billingAddress } from "../../src/data/factories.js";
import { invalidPayments, validPayments } from "../../src/data/payments.js";
import { expect, requiresWritableSut, test } from "../support/api-fixtures.js";

test.describe("Cart API @api @writes", () => {
  test.beforeEach(requiresWritableSut);

  test("TC-API-030 creates a cart and adds a product", async ({ api }) => {
    const [product] = (await api.getProducts()).data;
    const cartId = await api.createCart();

    await api.addToCart(cartId, String(product?.id), 2);
    const cart = await api.getCart(cartId);

    expect(cart.status).toBe(200);
    expect(cart.body.cart_items).toHaveLength(1);
  });

  test("TC-API-031 rejects adding an unknown product", async ({ api }) => {
    const cartId = await api.createCart();
    const result = await api.tryAddToCart(cartId, "01UNKNOWNPRODUCT00000000000", 1);

    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(result.status).toBeLessThan(500);
  });
});

test.describe("Payment API @api", () => {
  for (const [method, payment] of Object.entries(validPayments)) {
    test(`TC-API-040 accepts payment method "${method}"`, async ({ api }) => {
      const result = await api.tryCheckPayment(payment);

      expect(result.status).toBe(200);
    });
  }
});

test.describe("Payment API negative partitions @api", () => {
  test("TC-API-041 rejects a gift card number shorter than 16 characters", async ({
    api,
  }) => {
    const result = await api.tryCheckPayment({
      payment_method: "gift-card",
      payment_details: { gift_card_number: "GIFT1234ABCD567", validation_code: "VC12" },
    });

    expect(result.status).toBe(422);
  });

  test("TC-API-043 rejects an expired credit card", async ({ api }) => {
    const result = await api.tryCheckPayment({
      payment_method: "credit-card",
      payment_details: {
        ...validPayments["credit-card"]!.payment_details,
        expiration_date: "01/2020",
      },
    });

    expect(result.status).toBe(422);
  });

  // Generated test cases: TC-API-044..049
  for (const [index, { rule, payment }] of invalidPayments.entries()) {
    const caseId = `TC-API-${String(index + 44).padStart(3, "0")}`;
    test(`${caseId} rejects ${rule}`, async ({ api }) => {
      const result = await api.tryCheckPayment(payment);

      expect(result.status).toBe(422);
    });
  }

  test("TC-API-042 rejects an unknown payment method", async ({ api }) => {
    // DEF-002: PaymentController::check only validates the five known methods.
    test.fail(true, "DEF-002 undocumented payment methods are accepted");
    const result = await api.tryCheckPayment({
      payment_method: "crypto" as never,
      payment_details: {},
    });

    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(result.status).toBeLessThan(500);
  });
});

test.describe("Invoice and favorites API @api @writes", () => {
  test.beforeEach(requiresWritableSut);

  test("TC-API-050 checks out a cart and lists the invoice", async ({ customerApi }) => {
    const [product] = (await customerApi.getProducts()).data;
    const cartId = await customerApi.createCart();
    await customerApi.addToCart(cartId, String(product?.id), 1);

    const invoice = await customerApi.tryCreateInvoice(
      cartId,
      billingAddress,
      validPayments["cash-on-delivery"]!,
    );
    expect(invoice.status).toBeLessThan(300);
    expect(invoice.body.invoice_number).toEqual(expect.any(String));

    const invoices = await customerApi.getInvoices();
    expect(invoices.data.map((item) => item.invoice_number)).toContain(
      invoice.body.invoice_number,
    );
  });

  test("TC-API-051 requires authentication to create an invoice", async ({ api }) => {
    const cartId = await api.createCart();
    const result = await api.tryCreateInvoice(
      cartId,
      billingAddress,
      validPayments["cash-on-delivery"]!,
    );

    expect(result.status).toBe(401);
  });

  test("TC-API-052 adds a product to the customer's favorites", async ({
    customerApi,
  }) => {
    const { data } = await customerApi.getProducts({ page: 2 });
    const result = await customerApi.tryAddFavorite(String(data[0]?.id));

    expect(result.status).toBeLessThan(300);
  });
});
