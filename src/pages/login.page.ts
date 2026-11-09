import type { Locator, Page } from "@playwright/test";

export type LoginError = "email" | "password" | "login";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(siteUrl: string): Promise<void> {
    await this.page.goto(`${siteUrl}/auth/login`);
    await this.page.locator('[data-test="email"]').waitFor({ state: "visible" });
  }

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

  error(kind: LoginError): Locator {
    return this.page.locator(`[data-test="${kind}-error"]`);
  }
}
