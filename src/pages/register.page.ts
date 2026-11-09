import type { Locator, Page, Response } from "@playwright/test";

export const requiredRegisterFields = [
  "first-name",
  "last-name",
  "dob",
  "country",
  "postal_code",
  "house_number",
  "street",
  "city",
  "state",
  "phone",
  "email",
  "password",
] as const;
export type RegisterField = (typeof requiredRegisterFields)[number];

const REGISTER_TIMEOUT_MS = 20_000;

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async open(siteUrl: string): Promise<void> {
    await this.page.goto(`${siteUrl}/auth/register`);
    await this.page.locator('[data-test="first-name"]').waitFor({
      state: "visible",
      timeout: REGISTER_TIMEOUT_MS,
    });
  }

  async submit(): Promise<void> {
    await this.page.locator('[data-test="register-submit"]').click();
  }

  fieldError(field: RegisterField): Locator {
    return this.page.locator(`[data-test="${field}-error"]`);
  }

  registerError(): Locator {
    return this.page.locator('[data-test="register-error"]');
  }

  async register(user: {
    first_name: string;
    last_name: string;
    dob: string;
    phone: string;
    email: string;
    password: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postal_code: string;
    };
  }): Promise<Response> {
    await this.page.locator('[data-test="first-name"]').fill(user.first_name);
    await this.page.locator('[data-test="last-name"]').fill(user.last_name);
    await this.page.locator('[data-test="dob"]').fill(user.dob);
    await this.page.locator('[data-test="country"]').selectOption(user.address.country);
    await this.page.locator('[data-test="postal_code"]').fill(user.address.postal_code);
    await this.page.locator('[data-test="house_number"]').fill("1");
    await this.page.locator('[data-test="street"]').fill(user.address.street);
    await this.page.locator('[data-test="city"]').fill(user.address.city);
    await this.page.locator('[data-test="state"]').fill(user.address.state);
    await this.page.locator('[data-test="phone"]').fill(user.phone);
    await this.page.locator('[data-test="email"]').fill(user.email);
    await this.page.locator('[data-test="password"]').fill(user.password);

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (candidate) =>
          candidate.request().method() === "POST" &&
          new URL(candidate.url()).pathname.endsWith("/users/register"),
        { timeout: REGISTER_TIMEOUT_MS },
      ),
      this.page.locator('[data-test="register-submit"]').click(),
    ]);

    return response;
  }
}
