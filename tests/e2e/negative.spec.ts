import { expect, test } from "@playwright/test";
import { config } from "../../src/config/env.js";
import { buildRegistration } from "../../src/data/factories.js";
import { LoginPage } from "../../src/pages/login.page.js";
import { RegisterPage, requiredRegisterFields } from "../../src/pages/register.page.js";
import { gates } from "../support/gates.js";
import { markKnownDefect } from "../support/known-defect.js";

test.beforeEach(() => {
  gates.writableSut();
});

test.describe("Login form validation @e2e @negative", () => {
  test("TC-E2E-020 flags both required fields on an empty submit", async ({ page }) => {
    const login = new LoginPage(page);
    await login.open(config.siteUrl);

    await login.attempt("", "");

    await expect(login.error("email")).toBeVisible();
    await expect(login.error("password")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test("TC-E2E-021 rejects a malformed email before calling the API", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.open(config.siteUrl);
    let loginRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/users/login")) {
        loginRequests += 1;
      }
    });

    await login.attempt("not-an-email", "Whatever-123!");

    await expect(login.error("email")).toBeVisible();
    expect(loginRequests).toBe(0);
  });

  test("TC-E2E-022 shows a generic error for unknown credentials", async ({ page }) => {
    const login = new LoginPage(page);
    await login.open(config.siteUrl);

    // Unknown account: never brute-force the seeded customer, repeated failures lock it.
    await login.attempt(`ghost-${Date.now()}@example.test`, "Wrong-Pass-123!");

    await expect(login.error("login")).toBeVisible();
    await expect(page.locator('[data-test="nav-menu"]')).toBeHidden();
  });
});

test.describe("Registration form validation @e2e @negative", () => {
  test("TC-E2E-023 flags every required field on an empty submit", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.open(config.siteUrl);

    await register.submit();

    for (const field of requiredRegisterFields) {
      await expect(register.fieldError(field), `${field} error`).toBeVisible();
    }
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test("TC-E2E-024 refuses an email that is already registered", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.open(config.siteUrl);

    const response = await register.register(
      buildRegistration({ email: "customer@practicesoftwaretesting.com" }),
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    await expect(register.registerError()).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test("TC-E2E-025 explains the real password length rule", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.open(config.siteUrl);
    let registerRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/users/register")) {
        registerRequests += 1;
      }
    });

    await register.fill(buildRegistration({ password: "Ab1!xyz" }));
    await register.submit();

    await expect(register.fieldError("password")).toBeVisible();
    expect(registerRequests).toBe(0);
    const message = (await register.fieldError("password").innerText()).trim();
    markKnownDefect(
      message,
      "Password must be minimal 6 characters long.",
      "DEF-010 the form rejects a 7-character password with a minimum-6 message",
    );
    expect(message).toContain("8");
  });

  test("TC-E2E-026 links every field error to its input for assistive technology", async ({
    page,
  }) => {
    const register = new RegisterPage(page);
    await register.open(config.siteUrl);

    await register.submit();
    await expect(register.fieldError("house_number")).toBeVisible();

    const unlinked = await register.fieldsWithUnlinkedErrors();
    markKnownDefect(
      unlinked,
      ["house_number"],
      "DEF-011 the house number error is not linked to its input",
    );
    expect(unlinked).toEqual([]);
  });
});
