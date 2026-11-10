import { isRecord } from "./guards.js";

export const lighthouseBudgets = {
  performance: 0.6,
  accessibility: 0.8,
  "best-practices": 0.8,
} as const;
export const lighthouseSampleCount = 5;
export const lighthouseCollectionFile = "reports/lighthouse-collection.json";
export const lighthousePages = [
  { page: "home", path: "/" },
  { page: "login", path: "/auth/login" },
] as const;
const categoriesToCheck = ["performance", "accessibility", "best-practices"] as const;

export type LighthouseScores = { [K in keyof typeof lighthouseBudgets]: number };

export interface LighthousePage {
  page: string;
  url: string;
  scores: LighthouseScores;
  passed: boolean;
  samples?: LighthouseScores[];
}

export interface LighthouseSampledPage extends LighthousePage {
  samples: LighthouseScores[];
}

export function passesLighthouseBudgets(scores: LighthouseScores): boolean {
  return categoriesToCheck.every((key) => scores[key] >= lighthouseBudgets[key]);
}

export function aggregateLighthouseScores(samples: LighthouseScores[]): LighthouseScores {
  if (samples.length !== lighthouseSampleCount) {
    throw new Error(`Lighthouse: expected ${lighthouseSampleCount} samples.`);
  }
  const performance = samples
    .map((sample) => sample.performance)
    .toSorted((a, b) => a - b);
  return {
    performance: performance[Math.floor(performance.length / 2)],
    accessibility: Math.min(...samples.map((sample) => sample.accessibility)),
    "best-practices": Math.min(...samples.map((sample) => sample["best-practices"])),
  };
}

function loopbackUrl(page: string, value: unknown): URL {
  if (typeof value !== "string" || !URL.canParse(value)) {
    throw new Error(`Lighthouse ${page}: invalid final URL.`);
  }
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error(`Lighthouse ${page}: final URL is not a loopback HTTP URL.`);
  }
  return url;
}

export function lighthousePageUrl(page: string, value: unknown): string {
  const target = lighthousePages.find((candidate) => candidate.page === page);
  if (!target) throw new Error(`Lighthouse ${page}: unknown page.`);
  const url = loopbackUrl(page, value);
  if (url.pathname !== target.path || url.search || url.hash) {
    throw new Error(`Lighthouse ${page}: unexpected final URL.`);
  }
  return url.href;
}

export function assertCompleteLighthouseCollection(value: unknown): void {
  if (
    !isRecord(value) ||
    value.complete !== true ||
    value.sampleCount !== lighthouseSampleCount ||
    !Array.isArray(value.pages) ||
    value.pages.length !== lighthousePages.length ||
    value.pages.some((page: unknown, index: number) => {
      const expected = lighthousePages[index];
      return (
        !isRecord(page) || page.page !== expected.page || page.path !== expected.path
      );
    })
  ) {
    throw new Error("Lighthouse: incomplete or incompatible collection.");
  }
}

export function summarizeLighthouse(page: string, value: unknown): LighthousePage {
  if (!isRecord(value) || !isRecord(value.categories)) {
    throw new Error(`Lighthouse ${page}: missing categories.`);
  }
  if (value.runtimeError) throw new Error(`Lighthouse ${page}: runtime error reported.`);
  const url = loopbackUrl(page, value.finalDisplayedUrl);
  const categories = value.categories;
  const score = (name: keyof typeof lighthouseBudgets): number => {
    const category = categories[name];
    if (
      !isRecord(category) ||
      typeof category.score !== "number" ||
      !Number.isFinite(category.score) ||
      category.score < 0 ||
      category.score > 1
    ) {
      throw new Error(`Lighthouse ${page}: invalid ${name} score.`);
    }
    return category.score;
  };
  const scores = {
    performance: score("performance"),
    accessibility: score("accessibility"),
    "best-practices": score("best-practices"),
  };
  return {
    page,
    url: url.href,
    scores,
    passed: passesLighthouseBudgets(scores),
  };
}

export function summarizeLighthouseSamples(
  page: string,
  values: unknown[],
): LighthouseSampledPage {
  if (values.length !== lighthouseSampleCount) {
    throw new Error(`Lighthouse ${page}: expected ${lighthouseSampleCount} samples.`);
  }
  const results = values.map((value) => summarizeLighthouse(page, value));
  const url = lighthousePageUrl(page, results[0].url);
  if (results.some((result) => result.url !== url)) {
    throw new Error(`Lighthouse ${page}: inconsistent final URLs.`);
  }

  const samples = results.map((result) => result.scores);
  const scores = aggregateLighthouseScores(samples);
  return { page, url, scores, passed: passesLighthouseBudgets(scores), samples };
}
