import { expect, test } from "@playwright/test";
import { ToolshopApi } from "../../src/api/toolshop-api.js";
import { config } from "../../src/config/env.js";

test("public catalog API returns a product list", async ({ request }) => {
  test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live API suite is opt-in.");

  const api = new ToolshopApi(request, config.apiUrl);
  const result = await api.getProducts();

  expect(result.data.length).toBeGreaterThan(0);
  expect(result.data[0]).toMatchObject({
    id: expect.anything(),
    name: expect.any(String),
    price: expect.any(Number),
  });
});
