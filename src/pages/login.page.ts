import type { Locator, Page } from "@playwright/test";

export type LoginError = "email" | "password" | "login";

/** Login form interactions, separating successful sign-in from intentionally failing attempts. */
export class LoginPage {
  /** Wraps an existing browser page; sign-in updates that page's session. */
  constructor(private readonly page: Page) {}

  /** Opens the login route and waits until the email field is visible. */
  async open(siteUrl: string): Promise<void> {
    await this.page.goto(`${siteUrl}/auth/login`);
    await this.page.locator('[data-test="email"]').waitFor({ state: "visible" });
  }

  /** Submits credentials and waits for the authenticated navigation menu. */
  async signIn(email: string, password: string): Promise<void> {
    await this.attempt(email, password);
    await this.page.locator('[data-test="nav-menu"]').waitFor({ state: "visible" });
  }

  /** Submits the form without asserting the outcome, for negative scenarios. */
  async attempt(email: string, password: string): Promise<void> {
    await this.page.locator('[data-test="email"]').fill(email);
    await this.page.locator('[data-test="password"]').fill(password);
    await this.page.locator('[data-test="login-submit"]').click();
  }

  /** Returns a field-level or general login-error locator for caller-owned assertions. */
  error(kind: LoginError): Locator {
    return this.page.locator(`[data-test="${kind}-error"]`);
  }
}
