import { expect, test } from "@playwright/test";
import { collectDefects, trace } from "../../scripts/build-traceability.js";

const requirements = [
  { id: "REQ-1", title: "a", risk: "High", tests: ["TC-API-00[12]"] },
  { id: "REQ-2", title: "b", risk: "Low", tests: ["TC-SEC-\\d+"] },
];

test("traceability links tests to requirements by pattern", () => {
  const result = trace(requirements, ["TC-API-001", "TC-API-002", "TC-SEC-010"]);

  expect(result.matrix.get("REQ-1")).toEqual(["TC-API-001", "TC-API-002"]);
  expect(result.matrix.get("REQ-2")).toEqual(["TC-SEC-010"]);
  expect(result.untraced).toEqual([]);
  expect(result.uncovered).toEqual([]);
});

test("traceability reports orphan tests, uncovered requirements and dead patterns", () => {
  const result = trace(requirements, ["TC-API-001", "TC-API-099"]);

  expect(result.untraced).toEqual(["TC-API-099"]);
  expect(result.uncovered).toEqual(["REQ-2"]);
  expect(result.ghostTests).toContain("REQ-2: TC-SEC-\\d+");
});

test("defect log rows are parsed with their status", () => {
  const defects = collectDefects(
    "| DEF-001 | Title | Major | Medium | TC-API-025 | Open |\n| DEF-002 | T | Minor | Low | TC-API-042 | Fixed |",
  );

  expect([...defects]).toEqual([
    ["DEF-001", "Open"],
    ["DEF-002", "Fixed"],
  ]);
});
