import { test } from "@playwright/test";
import { config } from "../../src/config/env.js";

/** Seeded customer of the Toolshop sample data. Only trustworthy on the disposable SUT. */
export const seededCustomer = {
  email: "customer@practicesoftwaretesting.com",
  password: "welcome01",
} as const;

/** Single place that decides whether a suite may run against the current target. */
export const gates = {
  /** Suite mutates data (register, checkout): disposable local SUT only. */
  writableSut(): void {
    test.skip(
      process.env.TOOLSHOP_LIVE !== "1" || !config.allowsWrites,
      "Requires TOOLSHOP_TARGET=local and loopback-only site and API URLs.",
    );
  },
  /** Suite is read-only but needs a live UI target. */
  liveTarget(): void {
    test.skip(process.env.TOOLSHOP_LIVE !== "1", "Live suite is opt-in.");
  },
};
