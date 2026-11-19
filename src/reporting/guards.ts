/** Narrows untrusted JSON to a non-null, non-array object before field inspection. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
