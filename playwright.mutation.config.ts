import { defineConfig } from "@playwright/test";

// Fast, server-free run of the pure unit specs that StrykerJS executes per mutant.
export default defineConfig({
  testDir: "./tests/unit",
  testMatch: [
    "env.spec.ts",
    "exit-report.spec.ts",
    "history.spec.ts",
    "openapi-contract.spec.ts",
    "quality-report.spec.ts",
    "lighthouse.spec.ts",
  ],
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: "dot",
});
