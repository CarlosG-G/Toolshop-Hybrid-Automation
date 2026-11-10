import { expect, test } from "@playwright/test";
import { summarizeLighthouse } from "../../src/reporting/lighthouse.js";

function result(performance: number, accessibility: number, bestPractices: number) {
  return {
    finalDisplayedUrl: "http://127.0.0.1:4200/",
    categories: {
      performance: { score: performance },
      accessibility: { score: accessibility },
      "best-practices": { score: bestPractices },
    },
  };
}

test("Lighthouse budgets include the exact threshold and reject lower scores", () => {
  expect(summarizeLighthouse("home", result(0.6, 0.8, 0.8)).passed).toBe(true);
  expect(summarizeLighthouse("home", result(0.599, 0.8, 0.8)).passed).toBe(false);
  expect(summarizeLighthouse("login", result(0.9, 0.799, 0.9)).passed).toBe(false);
  expect(summarizeLighthouse("login", result(0.9, 0.9, 0.799)).passed).toBe(false);
});

test("Lighthouse reports missing, invalid or failed audits explicitly", () => {
  expect(() => summarizeLighthouse("home", {})).toThrow("missing categories");
  expect(() => summarizeLighthouse("home", result(Number.NaN, 0.8, 0.8))).toThrow(
    "invalid performance score",
  );
  expect(() =>
    summarizeLighthouse("home", { ...result(0.9, 0.9, 0.9), runtimeError: {} }),
  ).toThrow("runtime error");
});
