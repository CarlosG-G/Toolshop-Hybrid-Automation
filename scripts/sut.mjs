#!/usr/bin/env node
// Manage the self-hosted Toolshop SUT: up | seed | wait | down | reset
import { execFileSync } from "node:child_process";

const compose = ["compose", "-f", "docker/compose.yml"];
const apiUrl = process.env.TOOLSHOP_API_URL ?? "http://localhost:8091";
const siteUrl = process.env.TOOLSHOP_SITE_URL ?? "http://localhost:4200";
const timeoutMs = Number(process.env.SUT_TIMEOUT_MS ?? 600_000);

const docker = (...args) =>
  execFileSync("docker", [...compose, ...args], { stdio: "inherit" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url, label, accept = (r) => r.ok) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (accept(response)) {
        console.log(`✔ ${label} ready (${url}) after ${Math.round((Date.now() - start) / 1000)}s`);
        return;
      }
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.cause?.code ?? error.message;
    }
    await sleep(5_000);
  }
  throw new Error(`${label} not ready at ${url} within ${timeoutMs}ms (last: ${last})`);
}

async function seed() {
  const start = Date.now();
  for (;;) {
    try {
      docker("exec", "-T", "laravel-api", "php", "artisan", "migrate:fresh", "--seed", "--force");
      return;
    } catch (error) {
      if (Date.now() - start > timeoutMs) throw error;
      console.log("Database not ready yet, retrying seed in 5s…");
      await sleep(5_000);
    }
  }
}

async function wait() {
  await waitFor(`${apiUrl}/products?page=1`, "API");
  await waitFor(siteUrl, "UI");
}

const commands = {
  up: async () => {
    docker("up", "-d", "--pull", "missing");
    await seed();
    await wait();
  },
  seed,
  wait,
  reset: seed,
  down: async () => docker("down", "-v"),
};

const command = process.argv[2] ?? "up";
if (!(command in commands)) {
  console.error(`Unknown command "${command}". Use: ${Object.keys(commands).join(" | ")}`);
  process.exit(2);
}
await commands[command]();
