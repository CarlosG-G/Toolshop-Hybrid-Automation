import { expect, test } from "@playwright/test";
import { allowsLocalWrites } from "../../src/config/env.js";

test("write gates require a local target and loopback URLs for both services", () => {
  expect(
    allowsLocalWrites("local", "http://localhost:4200", "http://127.0.0.1:8091"),
  ).toBe(true);
  expect(allowsLocalWrites("local", "http://[::1]:4200", "http://[::1]:8091")).toBe(true);
  expect(
    allowsLocalWrites("stable", "http://localhost:4200", "http://127.0.0.1:8091"),
  ).toBe(false);
  expect(allowsLocalWrites("local", "https://example.com", "http://127.0.0.1:8091")).toBe(
    false,
  );
  expect(allowsLocalWrites("local", "http://localhost:4200", "https://example.com")).toBe(
    false,
  );
  expect(
    allowsLocalWrites("local", "http://localhost:4200", "http://localhost@example.com"),
  ).toBe(false);
  expect(
    allowsLocalWrites("local", "http://localhost:4200", "http://localhost.example.com"),
  ).toBe(false);
  expect(() => allowsLocalWrites("local", "invalid-url", "http://127.0.0.1")).toThrow();
});
