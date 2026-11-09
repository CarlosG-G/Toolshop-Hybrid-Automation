import { expect, test } from "@playwright/test";
import { OpenApiContract } from "../../src/api/openapi-contract.js";

const contract = OpenApiContract.fromDocument({
  openapi: "3.1.0",
  paths: {
    "/products/{productId}": {
      get: {
        responses: {
          "200": {
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Product" } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: "object",
        required: ["id", "price"],
        properties: {
          id: { type: "string" },
          price: { type: "number", example: 9.99 },
          brand: { type: ["object", "null"] },
        },
      },
    },
  },
});

test.describe("OpenAPI contract validator @unit @contract", () => {
  test("TC-CON-U01 accepts a body that honours the schema, including $ref and examples", () => {
    expect(
      contract.violations("get", "/products/{productId}", 200, {
        id: "01ABC",
        price: 12.5,
        brand: null,
      }),
    ).toEqual([]);
  });

  test("TC-CON-U02 reports type and required-field violations with their JSON pointer", () => {
    const violations = contract.violations("get", "/products/{productId}", 200, {
      price: "12.5",
    });
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("(root) must have required property 'id'"),
        expect.stringContaining("/price must be number"),
      ]),
    );
  });

  test("TC-CON-U03 fails loudly when the operation is not part of the contract", () => {
    expect(() => contract.violations("delete", "/products/{productId}", 204, {})).toThrow(
      /Contract has no application\/json schema/,
    );
  });

  test("TC-CON-U04 lists documented operations", () => {
    expect(contract.operations()).toEqual(["GET /products/{productId}"]);
  });
});
