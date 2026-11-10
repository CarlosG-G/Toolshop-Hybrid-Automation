export type ToolshopTarget = "stable" | "with-bugs" | "local";

const targets: Record<ToolshopTarget, { siteUrl: string; apiUrl: string }> = {
  stable: {
    siteUrl: "https://practicesoftwaretesting.com",
    apiUrl: "https://api.practicesoftwaretesting.com",
  },
  "with-bugs": {
    siteUrl: "https://with-bugs.practicesoftwaretesting.com",
    apiUrl: "https://api-with-bugs.practicesoftwaretesting.com",
  },
  local: {
    siteUrl: "http://localhost:4200",
    apiUrl: "http://127.0.0.1:8091",
  },
};

function parseTarget(value: string | undefined): ToolshopTarget {
  if (value === undefined || value === "") {
    return "stable";
  }

  if (value === "stable" || value === "with-bugs" || value === "local") {
    return value;
  }

  throw new Error(
    `Unsupported TOOLSHOP_TARGET "${value}". Expected "stable", "with-bugs" or "local".`,
  );
}

export function allowsLocalWrites(
  target: ToolshopTarget,
  siteUrl: string,
  apiUrl: string,
): boolean {
  if (target !== "local") return false;
  return [siteUrl, apiUrl].every((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  });
}

const target = parseTarget(process.env.TOOLSHOP_TARGET);
const defaults = targets[target];
const siteUrl = process.env.TOOLSHOP_SITE_URL ?? defaults.siteUrl;
const apiUrl = process.env.TOOLSHOP_API_URL ?? defaults.apiUrl;

export const config = {
  target,
  siteUrl,
  apiUrl,
  isLive: process.env.TOOLSHOP_MODE !== "mock",
  /** Write operations are limited to the disposable SUT on loopback addresses. */
  allowsWrites: allowsLocalWrites(target, siteUrl, apiUrl),
} as const;
