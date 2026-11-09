import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = join(root, "..", "tests", "fixtures");

const files = new Map([
  ["/", ["mock-shop.html", "text/html; charset=utf-8"]],
  ["/mock-shop.js", ["mock-shop.js", "text/javascript; charset=utf-8"]],
]);

const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(204).end();
    return;
  }

  const file = files.get(request.url ?? "");
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const body = await readFile(join(fixtureDirectory, file[0]));
    response.writeHead(200, { "content-type": file[1] }).end(body);
  } catch (error) {
    console.error("Could not serve mock fixture:", error);
    response.writeHead(500).end("Fixture unavailable");
  }
});

server.listen(4173, "127.0.0.1");
