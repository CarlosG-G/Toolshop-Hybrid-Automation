import { buildRegistration, dobForAge } from "../../src/data/factories.js";
import { expect, requiresWritableSut, test } from "../support/api-fixtures.js";
import { markKnownDefect } from "../support/known-defect.js";

test.describe("Authentication API @api", () => {
  test("TC-API-010 logs in an isolated customer and returns a bearer token", async ({
    api,
    customer,
  }) => {
    requiresWritableSut();
    const result = await api.tryLogin(customer);

    expect(result.status).toBe(200);
    expect(result.body.access_token).toEqual(expect.any(String));
  });

  test("TC-API-011 rejects a wrong password with 401", async ({ api, customer }) => {
    requiresWritableSut();
    const result = await api.tryLogin({ ...customer, password: "wrong-password" });

    expect(result.status).toBe(401);
    expect(result.body.access_token).toBeUndefined();
  });

  test("TC-API-014 rejects an unknown email with 401", async ({ api }) => {
    const result = await api.tryLogin({
      email: `unknown-${Date.now()}@example.test`,
      password: "Whatever-123!",
    });

    expect(result.status).toBe(401);
  });

  test("TC-API-012 rejects /users/me without a token", async ({ api }) => {
    const result = await api.tryMe();

    expect(result.status).toBe(401);
  });

  test("TC-API-013 returns the profile of the authenticated customer", async ({
    customer,
    customerApi,
  }) => {
    const result = await customerApi.tryMe();

    expect(result.status).toBe(200);
    expect(result.body.email).toBe(customer.email);
  });
});

test.describe("Registration API @api @writes", () => {
  test.beforeEach(requiresWritableSut);

  test("TC-API-020 registers a new customer who can then log in", async ({ api }) => {
    const user = buildRegistration();

    const registered = await api.tryRegister(user);
    expect(registered.status).toBe(201);

    const login = await api.tryLogin({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
  });

  test("TC-API-021 rejects a duplicated email", async ({ api }) => {
    const user = buildRegistration();
    expect((await api.tryRegister(user)).status).toBe(201);

    const duplicate = await api.tryRegister({ ...user });
    expect(duplicate.status).toBeGreaterThanOrEqual(400);
    expect(duplicate.status).toBeLessThan(500);
  });

  // Boundary value analysis on the documented rule "age between 18 and 75".
  const ageBoundaries = [
    {
      id: "TC-API-022",
      label: "17 years and 364 days (below min)",
      dob: dobForAge(18, 1),
      valid: false,
    },
    {
      id: "TC-API-023",
      label: "18 years and 1 day (min)",
      dob: dobForAge(18, -1),
      valid: true,
    },
    {
      id: "TC-API-024",
      label: "74 years and 364 days (inside max)",
      dob: dobForAge(75, 1),
      valid: true,
    },
    {
      id: "TC-API-025",
      label: "over 75 years (above max)",
      dob: dobForAge(76, -1),
      valid: false,
    },
    {
      id: "TC-API-068",
      label: "exactly 18 years old (min)",
      dob: dobForAge(18),
      valid: true,
    },
    {
      id: "TC-API-069",
      label: "exactly 75 years old (max)",
      dob: dobForAge(75),
      valid: true,
    },
  ];
  for (const boundary of ageBoundaries.filter((candidate) => candidate.valid)) {
    test(`${boundary.id} date of birth BVA accepts ${boundary.label}`, async ({
      api,
    }) => {
      const result = await api.tryRegister(buildRegistration({ dob: boundary.dob }));

      expect(result.status).toBe(201);
    });
  }
  for (const boundary of ageBoundaries.filter((candidate) => !candidate.valid)) {
    const knownDefect =
      boundary.id === "TC-API-025"
        ? "DEF-001 upper age limit is 93 instead of 75"
        : undefined;
    test(`${boundary.id} date of birth BVA rejects ${boundary.label}`, async ({
      api,
    }) => {
      const result = await api.tryRegister(buildRegistration({ dob: boundary.dob }));

      markKnownDefect(result.status, 201, knownDefect);
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(500);
    });
  }
  // Equivalence partitioning on the password policy (min 8, upper, lower, number, symbol).
  const passwords = [
    { id: "TC-API-026", label: "7 characters", value: "Ab1!xyz", valid: false },
    { id: "TC-API-027", label: "no symbol", value: "Abcdefg123", valid: false },
    { id: "TC-API-028", label: "no uppercase", value: "abcdef1!xyz", valid: false },
  ];
  for (const password of passwords) {
    test(`${password.id} password policy rejects ${password.label}`, async ({ api }) => {
      const result = await api.tryRegister(
        buildRegistration({ password: password.value }),
      );

      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(500);
    });
  }
});
