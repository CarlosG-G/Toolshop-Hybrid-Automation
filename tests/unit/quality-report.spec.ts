import { expect, test } from "@playwright/test";
import { summarizeK6, summarizeZap } from "../../src/reporting/quality.js";

test("k6 threshold booleans indicate breaches, not passes", () => {
  const value = {
    metrics: {
      http_req_duration: { "p(95)": 250, thresholds: { "p(95)<1500": false } },
      http_req_failed: { value: 0.005, thresholds: { "rate<0.01": false } },
      checks: { thresholds: { "rate>0.99": false } },
      http_reqs: { count: 100, rate: 10 },
      vus_max: { max: 50 },
    },
  };
  expect(summarizeK6(value)).toMatchObject({
    p95Ms: 250,
    failureRate: 0.005,
    maxVus: 50,
    thresholdsPassed: true,
  });
  value.metrics.http_req_failed.thresholds["rate<0.01"] = true;
  expect(summarizeK6(value).thresholdsPassed).toBe(false);
  expect(() => summarizeK6({ metrics: {} })).toThrow("missing threshold");
});

test("ZAP groups findings by risk without treating informational alerts as failures", () => {
  const result = summarizeZap({
    site: [
      {
        alerts: [
          { name: "Header missing", riskcode: "2", count: "3" },
          { name: "Application type", riskcode: "0", count: "1" },
        ],
      },
    ],
  });
  expect(result.byRisk).toEqual({ high: 0, medium: 1, low: 0, informational: 1 });
  expect(result.alerts[0]).toEqual({
    name: "Header missing",
    risk: "medium",
    instances: 3,
  });
  expect(() => summarizeZap({ site: [{ alerts: [{ name: "Invalid" }] }] })).toThrow(
    "invalid risk or instance count",
  );
});
