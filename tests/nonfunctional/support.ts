import { expect, test } from "@playwright/test";
import { config } from "../../src/config/env.js";

export const productNames = '[data-test="product-name"]';

export function requiresLocalUi(): void {
  test.skip(
    process.env.TOOLSHOP_LIVE !== "1" || !config.allowsWrites,
    "Non-functional UI checks run against the disposable local SUT.",
  );
}

export { expect, test };
