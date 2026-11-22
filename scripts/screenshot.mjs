/**
 * Maakt schermafbeeldingen van de app op telefoonformaat, zodat je een
 * ontwerp kan beoordelen zonder zelf te klikken.
 *
 *   npm run dev                       (in een andere terminal)
 *   npm run shots                     -> logt in als nesibe
 *   npm run shots -- rayan DeBF2026!  -> of als iemand anders
 *
 * De bestanden komen in shots/ en staan niet in git.
 */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const base = "http://localhost:3000";

const user = process.argv[2] ?? "nesibe";
const pass = process.argv[3] ?? "CigkofteQueen2026!";

await page.goto(base + "/login", { waitUntil: "networkidle" });
await page.screenshot({ path: "shots/login.png" });

await page.fill("#identifier", user);
await page.fill("#password", pass);
await Promise.all([page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 30000 }), page.click("button[type=submit]")]);
await page.waitForTimeout(1500);

for (const [name, path] of [["home", "/"], ["agenda", "/agenda"], ["new", "/new"], ["wallet", "/wallet"]]) {
  try {
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/${user}-${name}.png` });
    console.log("shot:", user, name);
  } catch (e) {
    console.log("skip:", name, String(e).slice(0, 80));
  }
}
await browser.close();
