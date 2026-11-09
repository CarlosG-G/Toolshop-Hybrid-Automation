import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
let server: Server;
let origin: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/products") {
      response.writeHead(200).end("{}");
    } else if (
      request.url === "/site" &&
      request.headers["user-agent"]?.includes("Chrome/")
    ) {
      response.writeHead(200, { "content-type": "text/html" }).end("<h1>Ready</h1>");
    } else {
      response.writeHead(403).end("Forbidden");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Health-check fixture did not bind to a TCP port.");
  }
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function runCheck(scope: string, sitePath = "/site") {
  return execFileAsync(process.execPath, ["scripts/check-target.mjs", scope], {
    env: {
      ...process.env,
      TOOLSHOP_TARGET: "stable",
      TOOLSHOP_API_URL: origin,
      TOOLSHOP_SITE_URL: `${origin}${sitePath}`,
    },
    timeout: 30_000,
  });
}

test("checks configured API and site URLs using the appropriate clients", async () => {
  const result = await runCheck("both");
  expect(result.stdout).toContain(`${origin}/products`);
  expect(result.stdout).toContain(`${origin}/site`);
});

test("reports a site that denies the browser request", async () => {
  await expect(runCheck("site", "/denied")).rejects.toThrow("HTTP 403");
});
