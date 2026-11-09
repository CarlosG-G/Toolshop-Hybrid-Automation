import { ToolshopApi } from "../../src/api/toolshop-api.js";
import { config } from "../../src/config/env.js";
import { buildRegistration } from "../../src/data/factories.js";
import { expect, requiresWritableSut, test } from "../support/api-fixtures.js";

/** Decodes the JWT payload without verifying it; tests only inspect claims. */
function jwtClaims(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload ?? "", "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

const base64url = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const LEAK_PATTERN = /SQLSTATE|stack ?trace|vendor[\\/]laravel|\.php|#0 \//i;

test.describe("Authentication and authorization (OWASP API1/API2/API5) @security", () => {
  test.beforeEach(requiresWritableSut);

  for (const path of ["/users/me", "/invoices", "/favorites", "/users"]) {
    test(`TC-SEC-001 rejects anonymous access to ${path}`, async ({ api }) => {
      const result = await api.tryGet(path);

      expect(result.status).toBe(401);
    });
  }

  test("TC-SEC-002 rejects a token with a tampered signature", async ({
    request,
    customerApi,
  }) => {
    const token = customerApi.accessToken!;
    const [header, payload, signature = ""] = token.split(".");
    const tampered = `${header}.${payload}.${[...signature].toReversed().join("")}`;
    expect(tampered).not.toBe(token);

    const result = await new ToolshopApi(request, config.apiUrl)
      .withToken(tampered)
      .tryMe();

    expect(result.status).toBe(401);
  });

  test("TC-SEC-003 rejects an unsigned token using alg=none", async ({
    request,
    customerApi,
  }) => {
    const claims = jwtClaims(customerApi.accessToken!);
    const forged = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ ...claims, role: "admin" })}.`;

    const result = await new ToolshopApi(request, config.apiUrl)
      .withToken(forged)
      .tryMe();

    expect(result.status).toBe(401);
  });

  test("TC-SEC-004 forbids customers from listing all users", async ({ customerApi }) => {
    const result = await customerApi.tryGet("/users");

    expect([401, 403]).toContain(result.status);
  });

  test("TC-SEC-005 ignores a role escalation attempt on registration", async ({
    request,
    api,
  }) => {
    const user = buildRegistration();
    const registered = await api.tryRegister({ ...user, role: "admin" } as never);
    expect(registered.status).toBe(201);

    const token = await new ToolshopApi(request, config.apiUrl).login({
      email: user.email,
      password: user.password,
    });

    expect(jwtClaims(token).role).toBe("user");
  });

  test("TC-SEC-006 never exposes sensitive user attributes", async ({ customerApi }) => {
    const result = await customerApi.tryMe();

    expect(result.status).toBe(200);
    for (const field of ["password", "role", "failed_login_attempts", "totp_secret"]) {
      expect(result.body, `${field} is hidden`).not.toHaveProperty(field);
    }
  });
});

test.describe("Injection and information disclosure (OWASP API8) @security", () => {
  test.beforeEach(requiresWritableSut);

  const payloads = [
    { id: "TC-SEC-010", label: "SQL injection", value: "' OR '1'='1' -- " },
    { id: "TC-SEC-011", label: "script injection", value: "<script>alert(1)</script>" },
    { id: "TC-SEC-012", label: "path traversal", value: "../../../../etc/passwd" },
  ];
  for (const payload of payloads) {
    test(`${payload.id} search treats ${payload.label} as plain data`, async ({
      api,
    }) => {
      const result = await api.tryGet<{ data: unknown[] }>("/products/search", {
        q: payload.value,
      });

      expect(result.status).toBe(200);
      expect(result.response.headers()["content-type"]).toContain("application/json");
      expect(result.body.data).toEqual([]);
      expect(await result.response.text()).not.toMatch(LEAK_PATTERN);
    });
  }

  test("TC-SEC-013 error responses do not leak implementation details", async ({
    api,
    request,
  }) => {
    const malformed = await request.post(`${config.apiUrl}/users/login`, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      data: '{"email": ',
    });
    const unknown = await api.tryGet("/products/01UNKNOWNPRODUCT00000000000");

    expect(await malformed.text()).not.toMatch(LEAK_PATTERN);
    expect(await unknown.response.text()).not.toMatch(LEAK_PATTERN);
  });
});
