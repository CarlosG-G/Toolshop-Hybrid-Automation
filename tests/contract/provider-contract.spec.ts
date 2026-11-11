import { billingAddress, buildRegistration } from "../../src/data/factories.js";
import { validPayments } from "../../src/data/payments.js";
import { expect, requiresWritableSut, test } from "../support/api-fixtures.js";
import { markKnownDefect } from "../support/known-defect.js";

/**
 * Consumer-side contract checks: real provider responses must honour the
 * OpenAPI document the provider itself publishes.
 */
test.describe("OpenAPI provider contract @contract", () => {
  test("TC-CON-001 publishes an OpenAPI 3.x document", async ({ contract }) => {
    expect(contract.version).toMatch(/^3\./);
    expect(contract.operations()).toContain("GET /products");
  });

  const readOnly = [
    { id: "TC-CON-002", path: "/products", url: "/products" },
    { id: "TC-CON-003", path: "/brands", url: "/brands" },
    { id: "TC-CON-004", path: "/categories/tree", url: "/categories/tree" },
  ];
  for (const operation of readOnly) {
    test(`${operation.id} GET ${operation.path} matches its schema`, async ({
      api,
      contract,
    }) => {
      const result = await api.tryGet(operation.url);

      expect(result.status).toBe(200);
      expect(contract.violations("get", operation.path, 200, result.body)).toEqual([]);
    });
  }

  test("TC-CON-005 GET /products/{productId} matches its schema", async ({
    api,
    contract,
  }) => {
    const [first] = (await api.getProducts()).data;
    const result = await api.tryGet(`/products/${String(first?.id)}`);

    expect(contract.violations("get", "/products/{productId}", 200, result.body)).toEqual(
      [],
    );
  });

  test("TC-CON-006 POST /users/login matches its schema", async ({
    api,
    contract,
    customer,
  }) => {
    const result = await api.tryLogin(customer);

    expect(result.status).toBe(200);
    expect(contract.violations("post", "/users/login", 200, result.body)).toEqual([]);
  });

  test("TC-CON-007 GET /users/me matches its schema", async ({
    customerApi,
    contract,
  }) => {
    const result = await customerApi.tryMe();

    expect(contract.violations("get", "/users/me", 200, result.body)).toEqual([]);
  });
});

/**
 * Operations the e2e and BDD browser flows call on the local SUT (captured from
 * the nginx access log of a full e2e + bdd run). Each one is validated against
 * the provider's own response schema.
 */
test.describe("OpenAPI contract for UI flow endpoints @contract", () => {
  test("TC-CON-008 GET /products/search matches its schema", async ({
    api,
    contract,
  }) => {
    const result = await api.tryGet("/products/search", { q: "pliers" });

    expect(result.status).toBe(200);
    expect(contract.violations("get", "/products/search", 200, result.body)).toEqual([]);
  });

  test("TC-CON-009 GET /products/{productId}/related matches its schema", async ({
    api,
    contract,
  }) => {
    const [first] = (await api.getProducts()).data;
    const result = await api.tryGet(`/products/${String(first?.id)}/related`);

    expect(result.status).toBe(200);
    expect(
      contract.violations("get", "/products/{productId}/related", 200, result.body),
    ).toEqual([]);
  });

  test("TC-CON-010 POST /payment/check matches its schema", async ({ api, contract }) => {
    const result = await api.tryCheckPayment(validPayments["cash-on-delivery"]!);

    expect(result.status).toBe(200);
    expect(contract.violations("post", "/payment/check", 200, result.body)).toEqual([]);
  });
});

test.describe("OpenAPI contract for UI flow writes @contract @writes", () => {
  test.beforeEach(requiresWritableSut);

  test("TC-CON-011 POST /users/register matches its schema", async ({
    api,
    contract,
  }) => {
    const result = await api.tryRegister(buildRegistration());

    expect(result.status).toBe(201);
    expect(contract.violations("post", "/users/register", 201, result.body)).toEqual([]);
  });

  test("TC-CON-012 cart operations match their schemas", async ({ api, contract }) => {
    const [product] = (await api.getProducts()).data;
    const created = await api.send<{ id: string }>("post", "/carts");
    expect(created.status).toBe(201);
    expect(contract.violations("post", "/carts", 201, created.body)).toEqual([]);

    const cartId = created.body.id;
    const added = await api.tryAddToCart(cartId, String(product?.id), 1);
    expect(added.status).toBe(200);
    expect(contract.violations("post", "/carts/{id}", 200, added.body)).toEqual([]);

    const cart = await api.getCart(cartId);
    expect(cart.status).toBe(200);
    expect(contract.violations("get", "/carts/{cartId}", 200, cart.body)).toEqual([]);

    const deleted = await api.send("delete", `/carts/${cartId}`);
    expect(deleted.status).toBe(204);
    expect(contract.documentedStatuses("delete", "/carts/{cartId}")).toContain(204);
  });

  test("TC-CON-013 POST /invoices returns a documented status and schema", async ({
    customerApi,
    contract,
  }) => {
    const [product] = (await customerApi.getProducts()).data;
    const cartId = await customerApi.createCart();
    await customerApi.addToCart(cartId, String(product?.id), 1);

    const result = await customerApi.tryCreateInvoice(
      cartId,
      billingAddress,
      validPayments["cash-on-delivery"]!,
    );

    const documented = contract.documentedStatuses("post", "/invoices");
    // The only documented success status is 200, so the body is checked against it.
    const violations = contract.violations("post", "/invoices", 200, result.body);
    markKnownDefect(
      {
        status: result.status,
        documented: documented.includes(result.status),
        violations,
      },
      {
        status: 201,
        documented: false,
        violations: ['/additional_discount_percentage must be number {"type":"number"}'],
      },
      "DEF-008 POST /invoices drifts from the provider contract: undocumented 201 and a null number",
    );
    expect(documented).toContain(result.status);
    expect(violations).toEqual([]);
  });
});
