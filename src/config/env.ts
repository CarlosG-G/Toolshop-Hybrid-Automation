export type ToolshopTarget = "stable" | "with-bugs";

const targets: Record<ToolshopTarget, { siteUrl: string; apiUrl: string }> = {
  stable: {
    siteUrl: "https://practicesoftwaretesting.com",
    apiUrl: "https://api.practicesoftwaretesting.com",
  },
  "with-bugs": {
    siteUrl: "https://with-bugs.practicesoftwaretesting.com",
    apiUrl: "https://api-with-bugs.practicesoftwaretesting.com",
  },
};

function parseTarget(value: string | undefined): ToolshopTarget {
  if (value === undefined || value === "") {
    return "stable";
  }

  if (value === "stable" || value === "with-bugs") {
    return value;
  }

  throw new Error(
    `Unsupported TOOLSHOP_TARGET "${value}". Expected "stable" or "with-bugs".`,
  );
}

const target = parseTarget(process.env.TOOLSHOP_TARGET);
const defaults = targets[target];

export const config = {
  target,
  siteUrl: process.env.TOOLSHOP_SITE_URL ?? defaults.siteUrl,
  apiUrl: process.env.TOOLSHOP_API_URL ?? defaults.apiUrl,
  isLive: process.env.TOOLSHOP_MODE !== "mock",
} as const;
