// index.js
import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";
import { findAddressCoords } from "./utils/addressPoints.js";

const app = express();
const PORT = process.env.PORT || 8787;

puppeteer.use(StealthPlugin());

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

  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", { waitUntil: "domcontentloaded" });

    await page.type("#omni-address", address, { delay: 50 });
    await page.keyboard.press("Enter");

    await page.waitForSelector("button.report-link.gold", { timeout: 20000 });
    await page.click("button.report-link.gold");

    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), { timeout: 20000 });

    // Extract core details
    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // Coordinates via address points
    const coords = findAddressCoords(address);

    let zoning = null;
    let overlays = null;

    if (coords && coords.x && coords.y) {
      console.log(`📍 Found coords ${coords.x}, ${coords.y} (${coords.municipality})`);
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
    }

    const scrapedData = {
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

    console.log("✅ Scraped Data:", JSON.stringify(scrapedData, null, 2));
    res.json(scrapedData);
  } catch (err) {
    console.error("❌ Scraper failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper ready on port ${PORT}`);
});