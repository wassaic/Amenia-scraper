// index.js
import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";

import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";
import { findAddressCoords } from "./utils/addressPoints.js";

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 10000;

//
// --- Load local data ---
const zoningPath = path.resolve("./utils/zoning.geojson");
const overlaysPath = path.resolve("./utils/overlays.geojson");
const addressPath = path.resolve("./utils/addressPoints.geojson");

let zoningData, overlaysData, addressData;

try {
  zoningData = JSON.parse(fs.readFileSync(zoningPath, "utf8"));
  console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load zoning.geojson:", err.message);
}

try {
  overlaysData = JSON.parse(fs.readFileSync(overlaysPath, "utf8"));
  console.log(`✅ Loaded overlays.geojson with ${overlaysData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load overlays.geojson:", err.message);
}

try {
  addressData = JSON.parse(fs.readFileSync(addressPath, "utf8"));
  console.log(`✅ Loaded addressPoints.geojson with ${addressData.features.length} address points.`);
} catch (err) {
  console.error("❌ Failed to load addressPoints.geojson:", err.message);
}

//
// --- Puppeteer configuration ---
async function getBrowser() {
  const isRender = !!process.env.RENDER;
  const executablePath =
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (isRender ? await chromium.executablePath() : undefined);

  return await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--disable-software-rasterizer",
    ],
    defaultViewport: chromium.defaultViewport,
  });
}

//
// --- Scraper endpoint ---
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing ?address=" });

  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.type("#omni-address", address);
    await page.keyboard.press("Enter");

    await page.waitForTimeout(5000);

    // Grab coordinates from the report
    const coords = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll("script"));
      for (const tag of scriptTags) {
        if (tag.innerText.includes("longitude") || tag.innerText.includes("latitude")) {
          const match = tag.innerText.match(/([-]?\d+\.\d+).*?([-]?\d+\.\d+)/);
          if (match) {
            return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
          }
        }
      }
      return null;
    });

    if (!coords) throw new Error("Coordinates not found");

    console.log(`📍 Found coords ${coords.x}, ${coords.y}`);

    // --- Local lookups ---
    const point = turf.point([coords.x, coords.y]);
    const zoning = getZoning(point, zoningData);
    const overlays = getOverlays(point, overlaysData);
    const addressInfo = findAddressCoords(address, addressData);

    const result = {
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        coordinates: { ...coords, ...addressInfo },
        zoning,
        overlays,
      },
    };

    console.log("✅ Scraped Data:", JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error("❌ Scrape failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

//
// --- Start server ---
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper ready at http://localhost:${PORT}`);
});