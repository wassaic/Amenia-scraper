import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";

import { findAddressCoords } from "./utils/addressPoints.js";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";
import { getCache, setCache } from "./utils/cache.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Enable stealth plugin to reduce blocking
puppeteer.use(StealthPlugin());

/**
 * Create and configure a browser instance.
 * Works both locally (with full Chrome) and on Render (with @sparticuz/chromium).
 */
async function launchBrowser() {
  try {
    const isRender = !!process.env.RENDER; // Render sets this automatically
    const launchOptions = isRender
      ? {
          headless: true,
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          defaultViewport: chromium.defaultViewport,
        }
      : {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
          ],
        };

    return await puppeteer.launch(launchOptions);
  } catch (err) {
    console.error("❌ Failed to launch browser:", err.message);
    throw err;
  }
}

/**
 * Root route for quick health check
 */
app.get("/", (req, res) => {
  res.send("✅ Amenia Scraper API is running.");
});

/**
 * Main scrape endpoint
 */
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing ?address parameter" });

  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const cached = getCache(address);
  if (cached) {
    console.log("⚡ Serving from cache");
    return res.json(cached);
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Go to GIS site
    await page.goto("https://gis.dutchessny.gov/address-info-finder/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Fill in address and trigger lookup
    await page.type("#inputAddress", address);
    await page.waitForTimeout(1000);
    await page.click("#searchBtn");
    await page.waitForTimeout(3000);

    console.log("📄 Extracting report details...");

    const data = await page.evaluate(() => {
      const output = {};
      const info = document.querySelectorAll(".infoPanel p, .infoPanel div");
      info.forEach((el) => {
        const text = el.textContent.trim();
        if (text.includes("Parcel Grid")) output.parcelGrid = text.split(":")[1]?.trim();
        if (text.includes("School District")) output.schoolDistrict = text.split(":")[1]?.trim();
        if (text.includes("Highway Department")) output.roadAuthority = text.split(":")[1]?.trim();
        if (text.includes("Fire Department")) output.fireStation = text.split(":")[1]?.trim();
        if (text.includes("Legislative District")) output.legislator = text.split(":")[1]?.trim();
      });
      return output;
    });

    const coords = findAddressCoords(address);
    console.log(`📍 Found coords ${coords?.x}, ${coords?.y} (${coords?.municipality})`);

    const zoning = coords ? getZoning(coords.x, coords.y) : null;
    const overlays = coords ? getOverlays(coords.x, coords.y) : [];

    const result = {
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        ...data,
        coordinates: coords || null,
        zoning: zoning || null,
        overlays: overlays || [],
      },
    };

    console.log("✅ Scraped Data:\n", JSON.stringify(result, null, 2));

    setCache(address, result);
    res.json(result);
  } catch (err) {
    console.error("❌ Scrape failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

/**
 * Start the Express server
 */
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper fully local or cloud at http://localhost:${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});