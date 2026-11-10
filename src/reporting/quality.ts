import {
  aggregateLighthouseScores,
  lighthousePageUrl,
  lighthouseSampleCount,
  passesLighthouseBudgets,
  type LighthousePage,
  type LighthouseScores,
} from "./lighthouse.js";
import { isRecord } from "./guards.js";

export interface LoadMetrics {
  p95Ms: number;
  failureRate: number;
  requests: number;
  requestsPerSecond: number;
  maxVus: number;
  thresholdsPassed: boolean;
}

export interface ZapAlert {
  name: string;
  risk: "high" | "medium" | "low" | "informational";
  instances: number;
}

export interface ZapMetrics {
  alerts: ZapAlert[];
  byRisk: Record<ZapAlert["risk"], number>;
}

function numberField(value: unknown, key: string, context: string): number {
  if (
    !isRecord(value) ||
    typeof value[key] !== "number" ||
    !Number.isFinite(value[key])
  ) {
    throw new Error(`${context}: invalid ${key}.`);
  }
  return value[key];
}

function lighthouseSummaryScores(input: unknown): LighthouseScores {
  const scores = {
    performance: numberField(input, "performance", "Lighthouse summary"),
    accessibility: numberField(input, "accessibility", "Lighthouse summary"),
    "best-practices": numberField(input, "best-practices", "Lighthouse summary"),
  };
  if (Object.values(scores).some((score) => score < 0 || score > 1)) {
    throw new Error("Lighthouse summary: score out of range.");
  }
  return scores;
}

export function summarizeK6(value: unknown): LoadMetrics {
  if (!isRecord(value) || !isRecord(value.metrics)) {
    throw new Error("k6 report: missing metrics.");
  }
  const {
    http_req_duration: duration,
    http_req_failed: failures,
    http_reqs: requests,
  } = value.metrics;
  const metricsWithThresholds = [duration, failures, value.metrics.checks];
  const breaches = metricsWithThresholds.flatMap((metric) => {
    if (!isRecord(metric) || !isRecord(metric.thresholds)) {
      throw new Error("k6 report: missing threshold results.");
    }
    const results = Object.values(metric.thresholds);
    if (results.length === 0 || results.some((result) => typeof result !== "boolean")) {
      throw new Error("k6 report: invalid threshold results.");
    }
    return results;
  });
  const failureRate = numberField(failures, "value", "k6 failure rate");
  if (failureRate < 0 || failureRate > 1) {
    throw new Error("k6 failure rate must be between 0 and 1.");
  }
  return {
    p95Ms: numberField(duration, "p(95)", "k6 duration"),
    failureRate,
    requests: numberField(requests, "count", "k6 requests"),
    requestsPerSecond: numberField(requests, "rate", "k6 requests"),
    maxVus: numberField(value.metrics.vus_max, "max", "k6 virtual users"),
    thresholdsPassed: breaches.every((breached) => breached === false),
  };
}

export function summarizeZap(value: unknown): ZapMetrics {
  if (!isRecord(value) || !Array.isArray(value.site)) {
    throw new Error("ZAP report: missing sites.");
  }
  const byRisk: ZapMetrics["byRisk"] = { high: 0, medium: 0, low: 0, informational: 0 };
  const alerts: ZapAlert[] = [];
  for (const site of value.site) {
    if (!isRecord(site) || !Array.isArray(site.alerts)) {
      throw new Error("ZAP report: missing alerts.");
    }
    for (const alert of site.alerts) {
      if (!isRecord(alert) || typeof alert.name !== "string") {
        throw new Error("ZAP report: invalid alert.");
      }
      const risk =
        alert.riskcode === "3"
          ? "high"
          : alert.riskcode === "2"
            ? "medium"
            : alert.riskcode === "1"
              ? "low"
              : alert.riskcode === "0"
                ? "informational"
                : null;
      const instances = Number(alert.count);
      if (!risk || !Number.isInteger(instances) || instances < 0) {
        throw new Error(`ZAP report: invalid risk or instance count for ${alert.name}.`);
      }
      byRisk[risk] += 1;
      alerts.push({ name: alert.name, risk, instances });
    }
  }
  return { alerts, byRisk };
}

export function summarizeLighthouseRun(value: unknown): {
  passed: boolean;
  pages: LighthousePage[];
} {
  if (
    !isRecord(value) ||
    typeof value.passed !== "boolean" ||
    !Array.isArray(value.pages)
  ) {
    throw new Error("Lighthouse summary: invalid run.");
  }
  const pages: LighthousePage[] = value.pages.map((page: unknown) => {
    if (
      !isRecord(page) ||
      typeof page.page !== "string" ||
      typeof page.url !== "string" ||
      typeof page.passed !== "boolean" ||
      !isRecord(page.scores)
    ) {
      throw new Error("Lighthouse summary: invalid page.");
    }
    const scores = lighthouseSummaryScores(page.scores);
    let samples: LighthouseScores[] | undefined;
    let url = page.url;
    if (page.samples !== undefined) {
      if (!Array.isArray(page.samples) || page.samples.length !== lighthouseSampleCount) {
        throw new Error("Lighthouse summary: invalid samples.");
      }
      url = lighthousePageUrl(page.page, url);
      samples = page.samples.map(lighthouseSummaryScores);
      const aggregate = aggregateLighthouseScores(samples);
      if (
        aggregate.performance !== scores.performance ||
        aggregate.accessibility !== scores.accessibility ||
        aggregate["best-practices"] !== scores["best-practices"] ||
        page.passed !== passesLighthouseBudgets(scores)
      ) {
        throw new Error("Lighthouse summary: inconsistent sample results.");
      }
    }
    return {
      page: page.page,
      url,
      passed: page.passed,
      scores,
      ...(samples ? { samples } : {}),
    };
  });
  if (
    pages.length !== 2 ||
    value.passed !== pages.every((page) => page.passed) ||
    (pages.some((page) => page.samples) && !pages.every((page) => page.samples)) ||
    (pages.every((page) => page.samples) &&
      (new Set(pages.map((page) => page.page)).size !== pages.length ||
        new Set(pages.map((page) => new URL(page.url).origin)).size !== 1))
  ) {
    throw new Error("Lighthouse summary: inconsistent page results.");
  }
  return { passed: value.passed, pages };
}
