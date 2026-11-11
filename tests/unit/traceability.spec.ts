import { expect, test } from "@playwright/test";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectDefects,
  collectDefectDetails,
  collectTestIds,
  trace,
  contractCoverageProblems,
} from "../../scripts/build-traceability.js";

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

test("defects retain severity and test links; missing links fail explicitly", () => {
  expect(
    collectDefectDetails(
      "| DEF-001 | Missing field | Major | High | TC-API-001 | Open |",
    ),
  ).toEqual([
    {
      id: "DEF-001",
      title: "Missing field",
      severity: "Major",
      priority: "High",
      tests: ["TC-API-001"],
      status: "Open",
    },
  ]);
  expect(() =>
    collectDefectDetails("| DEF-001 | Missing field | Major | High | none | Open |"),
  ).toThrow("does not reference a test case");
});

test("an optional issue column links each defect to its GitHub issue", () => {
  const [defect] = collectDefectDetails(
    "| DEF-004 | [#13](https://github.com/o/r/issues/13) | Bad email | Major | High | TC-API-062 | Open |",
  );

  expect(defect).toMatchObject({
    id: "DEF-004",
    title: "Bad email",
    tests: ["TC-API-062"],
    status: "Open",
    issue: "https://github.com/o/r/issues/13",
  });
});
test("traceability collects scenario outline IDs from Gherkin features", () => {
  const directory = mkdtempSync(join(tmpdir(), "toolshop-traceability-"));
  const feature = join(directory, "checkout.feature");
  try {
    writeFileSync(feature, "Scenario Outline: <case>\n| TC-BDD-010 |\n| TC-BDD-011 |\n");
    expect(collectTestIds(directory)).toEqual(["TC-BDD-010", "TC-BDD-011"]);
  } finally {
    unlinkSync(feature);
    rmdirSync(directory);
  }
});

test("contract coverage entries need a known test or a justification", () => {
  expect(
    contractCoverageProblems(
      [
        { operation: "GET /brands", tests: ["TC-CON-003"] },
        { operation: "GET /postcode-lookup", tests: [], note: "Third-party proxy." },
        { operation: "GET /orphan", tests: [] },
        { operation: "POST /invoices", tests: ["TC-CON-013", "TC-CON-999"] },
      ],
      ["TC-CON-003", "TC-CON-013"],
    ),
  ).toEqual([
    "Contract operation GET /orphan has neither tests nor a note",
    "Contract operation POST /invoices references unknown test TC-CON-999",
  ]);
});
