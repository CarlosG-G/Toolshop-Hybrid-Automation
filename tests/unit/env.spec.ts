import { expect, test } from "@playwright/test";
import { allowsLocalWrites, resolveToolshopConfig } from "../../src/config/env.js";

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

test("an empty or missing target resolves to the stable public deployment", () => {
  for (const env of [{}, { TOOLSHOP_TARGET: "" }]) {
    expect(resolveToolshopConfig(env)).toEqual({
      target: "stable",
      siteUrl: "https://practicesoftwaretesting.com",
      apiUrl: "https://api.practicesoftwaretesting.com",
      isLive: true,
      allowsWrites: false,
    });
  }
});

test("each supported target maps to its own site and API", () => {
  expect(resolveToolshopConfig({ TOOLSHOP_TARGET: "with-bugs" })).toMatchObject({
    target: "with-bugs",
    siteUrl: "https://with-bugs.practicesoftwaretesting.com",
    apiUrl: "https://api-with-bugs.practicesoftwaretesting.com",
    allowsWrites: false,
  });
  expect(resolveToolshopConfig({ TOOLSHOP_TARGET: "local" })).toMatchObject({
    target: "local",
    siteUrl: "http://localhost:4200",
    apiUrl: "http://127.0.0.1:8091",
    allowsWrites: true,
  });
});

test("URL overrides win over target defaults and still pass the write gate", () => {
  const config = resolveToolshopConfig({
    TOOLSHOP_TARGET: "local",
    TOOLSHOP_SITE_URL: "https://localhost:4300",
    TOOLSHOP_API_URL: "https://example.com",
    TOOLSHOP_MODE: "mock",
  });

  expect(config).toMatchObject({
    siteUrl: "https://localhost:4300",
    apiUrl: "https://example.com",
    isLive: false,
    allowsWrites: false,
  });
  expect(
    resolveToolshopConfig({
      TOOLSHOP_TARGET: "local",
      TOOLSHOP_SITE_URL: "https://localhost:4300",
    }).allowsWrites,
  ).toBe(true);
});

test("an unsupported target fails with an actionable message", () => {
  for (const target of ["production", "STABLE", " local"]) {
    expect(() => resolveToolshopConfig({ TOOLSHOP_TARGET: target })).toThrow(
      `Unsupported TOOLSHOP_TARGET "${target}". Expected "stable", "with-bugs" or "local".`,
    );
  }
});
