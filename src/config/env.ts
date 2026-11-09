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
    apiUrl: "http://localhost:8091",
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

const target = parseTarget(process.env.TOOLSHOP_TARGET);
const defaults = targets[target];

export const config = {
  target,
  siteUrl: process.env.TOOLSHOP_SITE_URL ?? defaults.siteUrl,
  apiUrl: process.env.TOOLSHOP_API_URL ?? defaults.apiUrl,
  isLive: process.env.TOOLSHOP_MODE !== "mock",
  /** Write operations (register, checkout, admin) are only allowed against the disposable local SUT. */
  allowsWrites: target === "local",
} as const;
