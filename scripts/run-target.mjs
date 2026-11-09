import { spawnSync } from "node:child_process";

const target = process.argv[2];
if (!["stable", "with-bugs", "local"].includes(target)) {
  console.error(
    'Usage: node scripts/run-target.mjs "stable|with-bugs|local" [Playwright args...]',
  );
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    "--workers=1",
    ...process.argv.slice(3),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TOOLSHOP_TARGET: target,
      TOOLSHOP_LIVE: "1",
    },
  },
);

if (result.error) {
  console.error("Could not start Playwright:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
