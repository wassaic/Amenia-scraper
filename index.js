import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";
import { findAddressCoords } from "./utils/addressPoints.js";

const app = express();
const PORT = process.env.PORT || 8787;

puppeteer.use(StealthPlugin());

// Utility to extract text safely
async function getText(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    const text = await page.$eval(selector, el => el.innerText.trim());
    return text || null;
  } catch {
    return null;
  }
}

app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address parameter" });

  console.log(`\n🌐 Scraping + zoning/overlay lookup for: ${address}`);

  // 🔹 Detect environment (Render vs Local)
  const isRender = !!process.env.RENDER;
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome';

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    console.log("🔗 Opening Dutchess County GIS Address Info Finder...");
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", { waitUntil: "domcontentloaded" });

    // Type the address
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.type("#omni-address", address, { delay: 50 });
    await page.keyboard.press("Enter");

    // Wait for the report button
    await page.waitForSelector("button.report-link.gold", { timeout: 20000 });
    await page.click("button.report-link.gold");

    // Wait for the report content
    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), { timeout: 20000 });

    console.log("📄 Extracting report details...");

    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // Get coordinates from local file lookup
    const coords = findAddressCoords(address);

    let zoning = null;
    let overlays = [];

    if (coords && coords.x && coords.y) {
      console.log(`📍 Found coords ${coords.x}, ${coords.y} (${coords.municipality})`);
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
    } else {
      console.warn("⚠️ Coordinates not found in local dataset.");
    }

    const result = {
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        parcelGrid,
        schoolDistrict,
        roadAuthority,
        fireStation,
        legislator,
        coordinates: coords || null,
        zoning,
        overlays
      }
    };

    console.log("✅ Scraped Data:\n", JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error("❌ Scraper failed:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper fully local or cloud at http://localhost:${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});