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

export interface RegistrationForm {
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
}

const REGISTER_TIMEOUT_MS = 20_000;

/** Registration UI actions and accessibility probes; does not decide which outcomes are expected. */
export class RegisterPage {
  /** Reuses an existing page so registration stays within the caller's browser context. */
  constructor(private readonly page: Page) {}

  /** Navigates to registration and waits for the first form field. */
  async open(siteUrl: string): Promise<void> {
    await this.page.goto(`${siteUrl}/auth/register`);
    await this.page.locator('[data-test="first-name"]').waitFor({
      state: "visible",
      timeout: REGISTER_TIMEOUT_MS,
    });
  }

  /** Clicks submit without waiting for a request, including client-side validation scenarios. */
  async submit(): Promise<void> {
    await this.page.locator('[data-test="register-submit"]').click();
  }

  /** Returns a required field's validation-message locator without asserting its contents. */
  fieldError(field: RegisterField): Locator {
    return this.page.locator(`[data-test="${field}-error"]`);
  }

  /** Returns the general registration-error locator for API-level rejection assertions. */
  registerError(): Locator {
    return this.page.locator('[data-test="register-error"]');
  }

  /**
   * Lists fields whose errors lack valid ARIA links, in required-field order.
   * Waits for each error/input and checks aria-invalid plus the error's described-by link.
   */
  async fieldsWithUnlinkedErrors(): Promise<RegisterField[]> {
    const unlinked: RegisterField[] = [];
    for (const field of requiredRegisterFields) {
      const input = this.page.locator(`[data-test="${field}"]`);
      const errorId = await this.fieldError(field).getAttribute("id");
      const describedBy = (await input.getAttribute("aria-describedby")) ?? "";
      const invalid = await input.getAttribute("aria-invalid");
      if (invalid !== "true" || !errorId || !describedBy.split(/\s+/).includes(errorId)) {
        unlinked.push(field);
      }
    }
    return unlinked;
  }

  /** Fills and submits the form while capturing its POST response, including HTTP rejections. */
  async register(user: RegistrationForm): Promise<Response> {
    await this.fill(user);

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

  /** Fills all registration inputs, using house number 1 for the reusable test address. */
  async fill(user: RegistrationForm): Promise<void> {
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
  }
}
