import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  TOOLSHOP_TARGET: "stable",
};
const health = spawnSync(process.execPath, ["scripts/check-target.mjs", "site"], {
  stdio: "inherit",
  env,
});
if (health.error) {
  console.error("Could not check the Toolshop site:", health.error);
  process.exit(1);
}
if (health.status !== 0) {
  console.error(
    "Cross-browser live tests were not started because the site is unavailable.",
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    "--workers=1",
    "tests/e2e",
    "tests/mocked",
  ],
  {
    stdio: "inherit",
    env: {
      ...env,
      TOOLSHOP_LIVE: "1",
      TOOLSHOP_BROWSER_MATRIX: "1",
    },
  },
);

if (result.error) {
  console.error("Could not start the cross-browser suite:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
