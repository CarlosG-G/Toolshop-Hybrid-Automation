import { test as base, expect, request as playwrightRequest } from "@playwright/test";
import { OpenApiContract } from "../../src/api/openapi-contract.js";
import { ToolshopApi } from "../../src/api/toolshop-api.js";
import { config } from "../../src/config/env.js";

export const customer = {
  email: "customer@practicesoftwaretesting.com",
  password: "welcome01",
} as const;

interface ApiFixtures {
  api: ToolshopApi;
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
  customerApi: async ({ request }, use) => {
    // Public environments are shared and their seeded passwords get changed by other users.
    test.skip(
      !config.allowsWrites,
      "Seeded customer credentials are only reliable locally.",
    );
    const api = new ToolshopApi(request, config.apiUrl);
    await api.login(customer);
    await use(api);
  },
});

test.beforeEach(() => {
  test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live API suite is opt-in.");
});

/** Write tests mutate data, so they only run against the disposable self-hosted SUT. */
export const requiresWritableSut = (): void => {
  test.skip(
    !config.allowsWrites,
    "Write operations only run against TOOLSHOP_TARGET=local.",
  );
};

export { expect };
