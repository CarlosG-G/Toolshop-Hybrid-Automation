import { expect, test } from "@playwright/test";
import {
  lighthouseBudgets,
  lighthouseSampleCount,
  summarizeLighthouse,
  summarizeLighthouseSamples,
} from "../../src/reporting/lighthouse.js";
import { summarizeLighthouseRun } from "../../src/reporting/quality.js";

function result(
  performance: number,
  accessibility: number,
  bestPractices: number,
  url = "http://127.0.0.1:4200/",
) {
  return {
    finalDisplayedUrl: url,
    categories: {
      performance: { score: performance },
      accessibility: { score: accessibility },
      "best-practices": { score: bestPractices },
    },
  };
}

function sampleResults(performances: number[], url = "http://127.0.0.1:4200/") {
  return performances.map((performance) => result(performance, 0.9, 0.95, url));
}

const loginUrl = "http://127.0.0.1:4200/auth/login";

test("Lighthouse budgets include the exact threshold and reject lower scores", () => {
  expect(summarizeLighthouse("home", result(0.6, 0.9, 0.9)).passed).toBe(true);
  expect(summarizeLighthouse("home", result(0.599, 0.9, 0.9)).passed).toBe(false);
  expect(summarizeLighthouse("home", result(0.6, 0.899, 0.9)).passed).toBe(false);
  expect(summarizeLighthouse("home", result(0.6, 0.9, 0.899)).passed).toBe(false);
  expect(summarizeLighthouse("login", result(0.7, 0.9, 0.9, loginUrl)).passed).toBe(true);
  expect(summarizeLighthouse("login", result(0.699, 0.9, 0.9, loginUrl)).passed).toBe(
    false,
  );
  expect(summarizeLighthouse("login", result(0.9, 0.899, 0.9, loginUrl)).passed).toBe(
    false,
  );
  expect(summarizeLighthouse("login", result(0.9, 0.9, 0.899, loginUrl)).passed).toBe(
    false,
  );
});

test("Lighthouse budgets are defined per page", () => {
  expect(lighthouseBudgets).toEqual({
    home: { performance: 0.6, accessibility: 0.9, "best-practices": 0.9 },
    login: { performance: 0.7, accessibility: 0.9, "best-practices": 0.9 },
  });
  expect(() => summarizeLighthouse("unknown", result(0.9, 0.9, 0.9))).toThrow(
    "unknown page",
  );
});

test("Lighthouse reports missing, invalid or failed audits explicitly", () => {
  expect(() => summarizeLighthouse("home", {})).toThrow("missing categories");
  expect(() => summarizeLighthouse("home", result(Number.NaN, 0.8, 0.8))).toThrow(
    "invalid performance score",
  );
  expect(() =>
    summarizeLighthouse("home", { ...result(0.9, 0.9, 0.9), runtimeError: {} }),
  ).toThrow("runtime error");
  expect(() => summarizeLighthouse("home", result(0.9, 0.9, 0.9, "not a URL"))).toThrow(
    "invalid final URL",
  );
  expect(() =>
    summarizeLighthouse("home", result(0.9, 0.9, 0.9, "https://example.com/")),
  ).toThrow("not a loopback");
});

test("Lighthouse gates the median of five performance samples without hiding them", () => {
  expect(lighthouseSampleCount).toBe(5);
  const page = summarizeLighthouseSamples(
    "home",
    sampleResults([0.59, 0.59, 0.6, 0.61, 0.75]),
  );
  expect(page.passed).toBe(true);
  expect(page.scores).toEqual({
    performance: 0.6,
    accessibility: 0.9,
    "best-practices": 0.95,
  });
  expect(page.samples.map((sample) => sample.performance)).toEqual([
    0.59, 0.59, 0.6, 0.61, 0.75,
  ]);
  expect(
    summarizeLighthouseSamples("home", sampleResults([0.59, 0.59, 0.59, 0.7, 0.8]))
      .passed,
  ).toBe(false);
});

test("Lighthouse uses the worst accessibility and best-practice samples", () => {
  const samples = sampleResults([0.7, 0.7, 0.7, 0.7, 0.7]);
  samples[1] = result(0.7, 0.79, 0.95);
  samples[3] = result(0.7, 0.9, 0.78);
  const page = summarizeLighthouseSamples("home", samples);
  expect(page.scores).toEqual({
    performance: 0.7,
    accessibility: 0.79,
    "best-practices": 0.78,
  });
  expect(page.passed).toBe(false);
  expect(
    summarizeLighthouseSamples(
      "home",
      Array.from({ length: 5 }, () => result(0.6, 0.9, 0.9)),
    ).passed,
  ).toBe(true);
});

test("Lighthouse rejects missing, failed, invalid or inconsistent samples", () => {
  const valid = sampleResults([0.7, 0.7, 0.7, 0.7, 0.7]);
  expect(() => summarizeLighthouseSamples("home", valid.slice(1))).toThrow(
    "expected 5 samples",
  );
  expect(() => summarizeLighthouseSamples("unknown", valid)).toThrow("unknown page");
  expect(() =>
    summarizeLighthouseSamples("home", [
      ...valid.slice(0, 4),
      result(0.7, 0.9, 0.9, "http://localhost:4200/"),
    ]),
  ).toThrow("inconsistent final URLs");
  expect(() =>
    summarizeLighthouseSamples("login", sampleResults([0.7, 0.7, 0.7, 0.7, 0.7])),
  ).toThrow("unexpected final URL");
  expect(() =>
    summarizeLighthouseSamples("home", [
      ...valid.slice(0, 4),
      { ...valid[4], runtimeError: { code: "FAILED" } },
    ]),
  ).toThrow("runtime error");
  expect(() =>
    summarizeLighthouseSamples("home", [...valid.slice(0, 4), result(1.1, 0.9, 0.9)]),
  ).toThrow("invalid performance score");
});

test("dashboard summary preserves samples and remains compatible with older runs", () => {
  const home = summarizeLighthouseSamples(
    "home",
    sampleResults([0.59, 0.6, 0.61, 0.62, 0.63]),
  );
  const login = summarizeLighthouseSamples(
    "login",
    sampleResults([0.7, 0.71, 0.72, 0.73, 0.74], "http://127.0.0.1:4200/auth/login"),
  );
  const summary = { passed: true, pages: [home, login] };
  expect(summarizeLighthouseRun(summary)).toEqual(summary);

  const { samples: _homeSamples, ...oldHome } = home;
  const { samples: _loginSamples, ...oldLogin } = login;
  expect(summarizeLighthouseRun({ passed: true, pages: [oldHome, oldLogin] })).toEqual({
    passed: true,
    pages: [oldHome, oldLogin],
  });
  expect(() => summarizeLighthouseRun({ passed: true, pages: [home, oldLogin] })).toThrow(
    "inconsistent page results",
  );
  expect(() => summarizeLighthouseRun({ passed: true, pages: [home, home] })).toThrow(
    "inconsistent page results",
  );
  expect(() =>
    summarizeLighthouseRun({
      passed: true,
      pages: [home, { ...login, url: "http://127.0.0.1:4201/auth/login" }],
    }),
  ).toThrow("inconsistent page results");
  expect(() =>
    summarizeLighthouseRun({
      passed: true,
      pages: [{ ...home, samples: home.samples.slice(0, 4) }, login],
    }),
  ).toThrow("invalid samples");
  expect(() =>
    summarizeLighthouseRun({
      passed: true,
      pages: [{ ...home, scores: { ...home.scores, performance: 0.9 } }, login],
    }),
  ).toThrow("inconsistent sample results");
  expect(() =>
    summarizeLighthouseRun({
      passed: true,
      pages: [
        {
          ...home,
          samples: [{ ...home.samples[0], accessibility: 1.1 }, ...home.samples.slice(1)],
        },
        login,
      ],
    }),
  ).toThrow("score out of range");
});
