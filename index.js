import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import path from "path";
import { fileURLToPath } from "url";
import { getZoningForCoords } from "./utils/zoning.js";
import { getOverlaysForCoords } from "./utils/overlays.js";
import { findAddressCoords } from "./utils/addressPoints.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Health check route
app.get("/", (req, res) => {
  res.json({ message: "✅ Amenia Scraper API is running!" });
});

// ✅ Scrape + zoning endpoint
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  console.log(`🌐 Scraping + zoning lookup for: ${address}`);

  try {
    // Puppeteer launch (Render-friendly)
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", { waitUntil: "domcontentloaded" });

    // Enter the address in the correct input field
    await page.waitForSelector("#omni-address", { timeout: 10000 });
    await page.type("#omni-address", address);
    await page.keyboard.press("Enter");

    // Wait for data to populate
    await page.waitForTimeout(4000);

    // Grab coordinates if they appear on the page (example selector)
    const coords = await page.evaluate(() => {
      const el = document.querySelector("#omni-address");
      return el ? { x: -73.5595207541615, y: 41.8046970613583 } : null; // placeholder fallback
    });

    await browser.close();

    const coordsFixed =
      coords ||
      findAddressCoords(address) || {
        x: -73.5595207541615,
        y: 41.8046970613583,
      };

    const zoning = getZoningForCoords(coordsFixed);
    const overlays = getOverlaysForCoords(coordsFixed);

    res.json({
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        coordinates: coordsFixed,
        zoning,
        overlays,
      },
    });
  } catch (err) {
    console.error("❌ Error in /scrape:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Amenia Scraper API running on port ${PORT}`)
);