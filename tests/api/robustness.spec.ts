import { buildRegistration } from "../../src/data/factories.js";
import { config } from "../../src/config/env.js";
import { expect, requiresWritableSut, test } from "../support/api-fixtures.js";
import { markKnownDefect } from "../support/known-defect.js";

test.describe("API robustness and input validation @api @negative", () => {
  test.beforeEach(requiresWritableSut);

  test("TC-API-060 answers a malformed JSON body with a client error", async ({
    request,
  }) => {
    const response = await request.post(`${config.apiUrl}/users/login`, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      data: '{"email": "broken"',
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("TC-API-061 reports every missing required field on an empty registration", async ({
    api,
  }) => {
    const result = await api.tryRegister({} as never);

    expect(result.status).toBe(422);
    const errors = JSON.stringify(result.body);
    for (const field of ["first_name", "last_name", "email", "password"]) {
      expect(errors, `${field} is reported`).toContain(field);
    }
  });

  test("TC-API-062 rejects a malformed email on registration", async ({ api }) => {
    const result = await api.tryRegister(
      buildRegistration({ email: `not-an-email-${crypto.randomUUID()}` }),
    );

    markKnownDefect(
      result.status,
      201,
      "DEF-004 the API accepts malformed emails that the UI rejects",
    );
    expect(result.status).toBe(422);
    expect(JSON.stringify(result.body)).toContain("email");
  });

  test("TC-API-067 rejects a registration without date of birth", async ({ api }) => {
    const { dob: _dob, ...withoutDob } = buildRegistration();
    const result = await api.tryRegister(withoutDob as never);

    markKnownDefect(
      result.status,
      201,
      "DEF-006 the API does not require dob while the UI does",
    );
    expect(result.status).toBe(422);
  });

  test("TC-API-070 refuses a second account for a whitespace-padded email", async ({
    api,
  }) => {
    const owner = buildRegistration();
    expect((await api.tryRegister(owner)).status).toBe(201);

    const result = await api.tryRegister(
      buildRegistration({ email: ` ${owner.email} ` }),
    );

    markKnownDefect(
      result.status,
      201,
      "DEF-009 a whitespace-padded email bypasses the duplicate-email check",
    );
    expect([409, 422]).toContain(result.status);
  });

  test("TC-API-063 never fails with a server error on oversized input", async ({
    api,
  }) => {
    const result = await api.tryRegister(
      buildRegistration({ first_name: "A".repeat(5_000), last_name: "B".repeat(5_000) }),
    );

    expect(result.status).toBeLessThan(500);
  });

  test("TC-API-064 returns an empty page beyond the last catalog page", async ({
    api,
  }) => {
    const result = await api.tryGet<{ data: unknown[] }>("/products", { page: 9_999 });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual([]);
  });

  test("TC-API-065 returns 404 for an unknown cart", async ({ api }) => {
    const result = await api.tryGet("/carts/01UNKNOWNCART0000000000000");

    expect(result.status).toBe(404);
  });

  test("TC-API-066 returns 404 for an unknown route", async ({ api }) => {
    const result = await api.tryGet("/this-route-does-not-exist");

    expect(result.status).toBe(404);
  });
});
