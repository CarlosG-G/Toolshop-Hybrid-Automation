import { expect, test } from "../support/api-fixtures.js";

test.describe("Catalog API @api @smoke", () => {
  test("TC-API-001 lists products with pagination metadata", async ({ api }) => {
    const page = await api.getProducts();

    expect(page.data.length).toBeGreaterThan(0);
    expect(page.current_page).toBe(1);
    expect(page.data[0]).toMatchObject({
      id: expect.anything(),
      name: expect.any(String),
      price: expect.any(Number),
    });
  });

  test("TC-API-002 returns a product by id", async ({ api }) => {
    const [first] = (await api.getProducts()).data;
    const product = await api.getProduct(String(first?.id));

    expect(product.name).toBe(first?.name);
  });

  test("TC-API-003 returns 404 for an unknown product", async ({ api }) => {
    const result = await api.tryGet("/products/01UNKNOWNPRODUCT00000000000");

    expect(result.status).toBe(404);
  });

  test("TC-API-004 searches products by name", async ({ api }) => {
    const result = await api.searchProducts("Pliers");

    expect(result.data.length).toBeGreaterThan(0);
    for (const product of result.data) {
      expect(product.name.toLowerCase()).toContain("pliers");
    }
  });

  test("TC-API-005 sorts products by ascending price", async ({ api }) => {
    const { data } = await api.getProducts({ sort: "price,asc" });
    const prices = data.map((product) => product.price);

    expect(prices).toEqual(prices.toSorted((a, b) => a - b));
  });
});
