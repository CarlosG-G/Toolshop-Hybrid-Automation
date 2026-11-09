const target = process.env.TOOLSHOP_TARGET ?? "stable";
const targets = {
  stable: {
    api: "https://api.practicesoftwaretesting.com",
    site: "https://practicesoftwaretesting.com",
  },
  "with-bugs": {
    api: "https://api-with-bugs.practicesoftwaretesting.com",
    site: "https://with-bugs.practicesoftwaretesting.com",
  },
};

if (!Object.hasOwn(targets, target)) {
  console.error(`Unsupported TOOLSHOP_TARGET "${target}".`);
  process.exit(2);
}

const scope = process.argv[2] ?? "both";
if (scope !== "api" && scope !== "site" && scope !== "both") {
  console.error(
    `Unsupported health check scope "${scope}". Expected api, site, or both.`,
  );
  process.exit(2);
}

const checks = scope === "both" ? ["api", "site"] : [scope];
const failures = [];
const apiUrl = process.env.TOOLSHOP_API_URL ?? targets[target].api;
const siteUrl = process.env.TOOLSHOP_SITE_URL ?? targets[target].site;

async function checkApi(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
}

async function checkSite(url) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    if (!response) {
      throw new Error("Site navigation returned no HTTP response.");
    }
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()} ${response.statusText()}`);
    }
  } finally {
    await browser.close();
  }
}

for (const check of checks) {
  const url = check === "api" ? `${apiUrl}/products` : siteUrl;
  try {
    await (check === "api" ? checkApi(url) : checkSite(url));
    console.log(`Toolshop ${check} "${target}" is available (${url}).`);
  } catch (error) {
    console.error(`Toolshop ${check} "${target}" is unavailable:`, error);
    failures.push(check);
  }
}

if (failures.length > 0) {
  process.exit(1);
}
