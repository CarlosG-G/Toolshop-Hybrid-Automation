import { deepStrictEqual } from "node:assert/strict";
import { test } from "@playwright/test";

/**
 * Marks an expected failure only after an exact defect-signature match.
 * No description means normal assertions; changed signatures fail instead of hiding regressions.
 */
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
