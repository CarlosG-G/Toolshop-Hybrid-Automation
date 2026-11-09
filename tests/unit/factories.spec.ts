import { expect, test } from "@playwright/test";
import { createDemoUser } from "../../src/data/factories.js";

test("demo user factory produces isolated valid test identities", () => {
  const first = createDemoUser("run-000001");
  const second = createDemoUser("run-000002");

  expect(first.email).toMatch(/^toolshop-run000001@example\.test$/);
  expect(second.email).not.toBe(first.email);
  expect(first.password).not.toBe(second.password);
});

test("demo user factory rejects a short seed", () => {
  expect(() => createDemoUser("abc")).toThrow(
    "Demo user seed must contain at least six alphanumeric characters.",
  );
});
