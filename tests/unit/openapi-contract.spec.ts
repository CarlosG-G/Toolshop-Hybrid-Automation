import { expect, test, type APIRequestContext } from "@playwright/test";
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

const json = (schema: unknown): { content: Record<string, { schema?: unknown }> } => ({
  content: { "application/json": { schema } },
});

const edgeContract = OpenApiContract.fromDocument({
  openapi: "3.1.1",
  paths: {
    "/stock/{sku}": {
      parameters: [],
      get: { responses: { "200": json({ type: "integer", format: "int32" }) } },
      post: { responses: { "201": json({ type: "string", format: "password" }) } },
      put: { responses: { "200": json({ type: "integer", format: "int64" }) } },
      patch: { responses: { "200": json({ type: "number", format: "float" }) } },
      delete: { responses: { "200": json({ type: "number", format: "double" }) } },
    },
    "/files/a~b": { get: { responses: { "200": json({ type: "string" }) } } },
    "/no-responses": { get: {} },
    "/no-content": { get: { responses: { "200": {} } } },
    "/no-schema": { get: { responses: { "200": json(undefined) } } },
  },
} as Parameters<typeof OpenApiContract.fromDocument>[0]);

test.describe("OpenAPI contract edge cases @unit @contract", () => {
  test("TC-CON-U05 exposes the document version", () => {
    expect(contract.version).toBe("3.1.0");
    expect(edgeContract.version).toBe("3.1.1");
  });

  test("TC-CON-U06 lists every HTTP method and ignores path-level keys", () => {
    expect(edgeContract.operations()).toEqual([
      "GET /stock/{sku}",
      "POST /stock/{sku}",
      "PUT /stock/{sku}",
      "PATCH /stock/{sku}",
      "DELETE /stock/{sku}",
      "GET /files/a~b",
      "GET /no-responses",
      "GET /no-content",
      "GET /no-schema",
    ]);
  });

  test("TC-CON-U07 treats OpenAPI numeric and password formats as annotations", () => {
    expect(edgeContract.violations("get", "/stock/{sku}", 200, 2 ** 40)).toEqual([]);
    expect(edgeContract.violations("post", "/stock/{sku}", 201, "secret")).toEqual([]);
    expect(edgeContract.violations("put", "/stock/{sku}", 200, 2 ** 60)).toEqual([]);
    expect(edgeContract.violations("patch", "/stock/{sku}", 200, 1.5)).toEqual([]);
    expect(edgeContract.violations("delete", "/stock/{sku}", 200, 2.5)).toEqual([]);
    expect(edgeContract.violations("get", "/stock/{sku}", 200, "7")).toEqual([
      '(root) must be integer {"type":"integer"}',
    ]);
  });

  test("TC-CON-U08 resolves paths that need JSON pointer escaping", () => {
    expect(edgeContract.violations("get", "/files/a~b", 200, "ok")).toEqual([]);
    expect(edgeContract.violations("get", "/files/a~b", 200, 1)).toEqual([
      '(root) must be string {"type":"string"}',
    ]);
  });

  test("TC-CON-U09 reports incomplete operations as missing schemas", () => {
    const cases: [string, number][] = [
      ["/unknown", 200],
      ["/no-responses", 200],
      ["/no-content", 200],
      ["/no-schema", 200],
      ["/files/a~b", 404],
    ];
    for (const [path, status] of cases) {
      expect(() => edgeContract.violations("get", path, status, {})).toThrow(
        `Contract has no application/json schema for get ${path} ${status} application/json.`,
      );
    }
    expect(() =>
      edgeContract.violations("get", "/files/a~b", 200, "ok", "text/plain"),
    ).toThrow("Contract has no text/plain schema");
  });

  test("TC-CON-U10 loads the provider document and fails on HTTP errors", async () => {
    const urls: string[] = [];
    const fake = (ok: boolean, status: number) =>
      ({
        get: async (url: string) => {
          urls.push(url);
          return {
            ok: () => ok,
            status: () => status,
            json: async () => edgeContract.document,
          };
        },
      }) as unknown as APIRequestContext;

    const loaded = await OpenApiContract.load(fake(true, 200), "http://api.test");
    expect(loaded.version).toBe("3.1.1");
    await expect(
      OpenApiContract.load(fake(false, 503), "http://api.test"),
    ).rejects.toThrow("OpenAPI document unavailable: HTTP 503");
    expect(urls).toEqual([
      "http://api.test/docs?api-docs.json",
      "http://api.test/docs?api-docs.json",
    ]);
  });

  test("TC-CON-U11 lists documented status codes and ignores non-numeric keys", () => {
    const statuses = OpenApiContract.fromDocument({
      openapi: "3.1.0",
      paths: {
        "/invoices": {
          post: { responses: { "200": {}, "422": {}, default: {}, "4XX": {} } },
        },
      },
    });
    expect(statuses.documentedStatuses("post", "/invoices")).toEqual([200, 422]);
    expect(() => statuses.documentedStatuses("get", "/invoices")).toThrow(
      "Contract has no GET /invoices operation.",
    );
    expect(() => statuses.documentedStatuses("post", "/missing")).toThrow(
      "Contract has no POST /missing operation.",
    );
  });
});
