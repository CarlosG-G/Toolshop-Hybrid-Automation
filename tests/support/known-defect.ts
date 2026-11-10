import { deepStrictEqual } from "node:assert/strict";
import { test } from "@playwright/test";

export function markKnownDefect<T>(
  observed: T,
  expectedSignature: T,
  description?: string,
): void {
  if (description === undefined) return;
  if (!description.trim()) throw new Error("Known-defect description cannot be empty.");
  deepStrictEqual(
    observed,
    expectedSignature,
    `${description}: observed defect signature changed`,
  );
  test.fail(true, description);
}
