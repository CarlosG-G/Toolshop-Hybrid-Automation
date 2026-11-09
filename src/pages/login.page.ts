import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(siteUrl: string): Promise<void> {
    await this.page.goto(`${siteUrl}/auth/login`);
    await this.page.locator('[data-test="email"]').waitFor({ state: "visible" });
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.page.locator('[data-test="email"]').fill(email);
    await this.page.locator('[data-test="password"]').fill(password);
    await this.page.locator('[data-test="login-submit"]').click();
    await this.page.locator('[data-test="nav-menu"]').waitFor({ state: "visible" });
  }
}
