export const lighthouseBudgets = {
  performance: 0.6,
  accessibility: 0.8,
  "best-practices": 0.8,
} as const;
const categoriesToCheck = ["performance", "accessibility", "best-practices"] as const;

export interface LighthousePage {
  page: string;
  url: string;
  scores: { [K in keyof typeof lighthouseBudgets]: number };
  passed: boolean;
}

export function summarizeLighthouse(page: string, value: unknown): LighthousePage {
  if (!isRecord(value) || !isRecord(value.categories)) {
    throw new Error(`Lighthouse ${page}: missing categories.`);
  }
  if (value.runtimeError) throw new Error(`Lighthouse ${page}: runtime error reported.`);
  if (typeof value.finalDisplayedUrl !== "string") {
    throw new Error(`Lighthouse ${page}: missing final URL.`);
  }
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
    url: value.finalDisplayedUrl,
    scores,
    passed: categoriesToCheck.every((key) => scores[key] >= lighthouseBudgets[key]),
  };
}
import { isRecord } from "./guards.js";
