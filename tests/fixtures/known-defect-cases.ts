import { expect, test } from "@playwright/test";
import { markKnownDefect } from "../support/known-defect.js";

test("known signature is detected", () => {
  markKnownDefect(201, 201, "Known defect");
  expect(201).toBe(422);
});

test("a fixed signature fails before the expected-failure marker", () => {
  markKnownDefect(422, 201, "Known defect");
  expect(422).toBe(422);
});

test("an unrelated regression fails before the expected-failure marker", () => {
  markKnownDefect(500, 201, "Known defect");
  expect(500).toBe(422);
});

test("a case without a known defect remains a normal pass", () => {
  markKnownDefect(422, 201);
  expect(422).toBe(422);
});
