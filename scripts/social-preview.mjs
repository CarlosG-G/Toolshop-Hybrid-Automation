// Renders the GitHub social preview card (1280x640) used when the repository link is shared.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = resolve(process.argv[2] ?? "docs/assets/social-preview.png");

const chips = [
  "Playwright",
  "Vibium · WebDriver BiDi",
  "BDD",
  "OpenAPI contract",
  "WCAG 2.1 AA",
  "OWASP · ZAP",
  "k6",
  "Lighthouse",
  "Mutation testing",
  "ISTQB · ISO 29119-3",
];

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1280px;height:640px;font-family:"Segoe UI",system-ui,sans-serif;color:#f8fafc;
background:radial-gradient(circle at 85% 15%,rgba(59,130,246,.35),transparent 45%),linear-gradient(150deg,#0b1222 0%,#111d3d 60%,#17327f 100%);
padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.tag{display:inline-block;border:2px solid #3b82f6;color:#93c5fd;border-radius:999px;padding:8px 20px;font-weight:600;letter-spacing:.12em;font-size:20px}
h1{font-size:76px;line-height:1.02;font-weight:900;margin-top:26px}
h1 span{color:#93c5fd}
p{font-size:28px;color:#cbd5e1;margin-top:18px;max-width:1040px;line-height:1.35}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chip{background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.3);border-radius:12px;padding:8px 16px;font-size:21px;font-weight:600}
footer{display:flex;justify-content:space-between;color:#94a3b8;font-size:22px}
</style><body>
<div><span class="tag">SDET PORTFOLIO</span>
<h1>Toolshop <span>Hybrid</span> Automation</h1>
<p>Risk-based quality engineering: hybrid UI verification, API and contract tests, security, performance and ISTQB test management in a hardened CI/CD pipeline.</p></div>
<div class="chips">${chips.map((c) => `<span class="chip">${c}</span>`).join("")}</div>
<footer><span>github.com/CarlosG-G/Toolshop-Hybrid-Automation</span><span>Live dashboard on GitHub Pages</span></footer>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  await page.setContent(html, { waitUntil: "load" });
  const overflow = await page.evaluate(() => document.body.scrollHeight > 640);
  if (overflow) throw new Error("Social preview content overflows 1280x640");
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  console.log(out);
} finally {
  await browser.close();
}
