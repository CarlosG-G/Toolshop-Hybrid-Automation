import { test as base, expect, request as playwrightRequest } from "@playwright/test";
import { OpenApiContract } from "../../src/api/openapi-contract.js";
import { ToolshopApi } from "../../src/api/toolshop-api.js";
import { config } from "../../src/config/env.js";
import { buildRegistration, type DemoUser } from "../../src/data/factories.js";
import { gates } from "./gates.js";

interface ApiFixtures {
  api: ToolshopApi;
  customer: Pick<DemoUser, "email" | "password">;
  customerApi: ToolshopApi;
}

interface ApiWorkerFixtures {
  contract: OpenApiContract;
}

/** API test fixtures: an anonymous client, an authenticated customer and the provider contract. */
export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  contract: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright requires a destructured fixture argument.
    async ({}, use) => {
      const context = await playwrightRequest.newContext();
      try {
        await use(await OpenApiContract.load(context, config.apiUrl));
      } finally {
        await context.dispose();
      }
    },
    { scope: "worker" },
  ],
  api: async ({ request }, use) => {
    await use(new ToolshopApi(request, config.apiUrl));
  },
  customer: async ({ api }, use) => {
    test.skip(
      !config.allowsWrites,
      "Creating isolated customers requires the disposable self-hosted SUT.",
    );
    const user = buildRegistration();
    const registered = await api.tryRegister(user);
    expect(registered.status, "Failed to create an isolated test customer").toBe(201);
    await use({ email: user.email, password: user.password });
  },
  customerApi: async ({ api, customer }, use) => {
    await api.login(customer);
    await use(api);
  },
});

test.beforeEach(() => {
  test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live API suite is opt-in.");
});

/** Write tests mutate data, so they only run against the disposable self-hosted SUT. */
export const requiresWritableSut = (): void => gates.writableSut();

export { expect };
