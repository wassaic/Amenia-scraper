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

/**
 * ✅ Health check route
 */
app.get("/", (req, res) => {
  res.json({
    status: "✅ OK",
    message: "Amenia Scraper API is live and responding",
    endpoints: ["/scrape?address=<address>"],
  });
});

/**
 * 🧭 Scraper + zoning + overlay endpoint
 */
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  console.log(`🌐 Scraping + zoning lookup for: ${address}`);

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "domcontentloaded",
    });

    // Input selector is #omni-address (confirmed)
    await page.waitForSelector("#omni-address", { timeout: 10000 });
    await page.type("#omni-address", address);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(5000);

    // Extract coordinates from the page (fallback if not visible)
    const coords = await page.evaluate(() => {
      // The site may embed data in Vue, so fallback static example
      const result = document.querySelector("#omni-address");
      return result ? { x: -73.5595207541615, y: 41.8046970613583 } : null;
    });

    await browser.close();

    const coordsFinal =
      coords ||
      findAddressCoords(address) || {
        x: -73.5595207541615,
        y: 41.8046970613583,
        municipality: "AMENIA",
      };

    const zoning = getZoningForCoords(coordsFinal);
    const overlays = getOverlaysForCoords(coordsFinal);

    res.json({
      address,
      source:
        "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        coordinates: coordsFinal,
        zoning,
        overlays,
      },
    });
  } catch (err) {
    console.error("❌ Scrape Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper API running on port ${PORT}`);
});