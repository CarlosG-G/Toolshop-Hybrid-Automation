import { customer, expect, test } from "../support/api-fixtures.js";

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

  test("TC-CON-006 POST /users/login matches its schema", async ({ api, contract }) => {
    const result = await api.tryLogin(customer);

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
