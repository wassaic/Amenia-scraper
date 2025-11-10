import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getZoningForCoords } from "./utils/zoning.js";
import { getOverlaysForCoords } from "./utils/overlays.js";
import { findAddressCoords } from "./utils/addressPoints.js";

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data files
const zoningData = JSON.parse(fs.readFileSync(path.join(__dirname, "utils/zoning.geojson")));
const overlayData = JSON.parse(fs.readFileSync(path.join(__dirname, "utils/overlays.geojson")));
const addressData = JSON.parse(fs.readFileSync(path.join(__dirname, "utils/addressPoints.geojson")));

console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);
console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);
console.log(`✅ Loaded addressPoints.geojson with ${addressData.features.length} address points.`);

// Puppeteer setup for Render
const chromePath = chromium.executablePath();

async function scrapeAddress(address) {
  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: await chromePath,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
  });

  const page = await browser.newPage();
  await page.goto("https://gis.dutchessny.gov/addressinfofinder/", { waitUntil: "domcontentloaded" });

  await page.waitForSelector("#omni-address", { timeout: 10000 });
  await page.type("#omni-address", address);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);

  // You can extract additional details from page.evaluate() if needed
  const coords = await page.evaluate(() => {
    const map = window.__map__;
    if (!map) return null;
    const center = map.getCenter();
    return { x: center.lng, y: center.lat };
  });

  await browser.close();
  if (!coords) throw new Error("Could not extract coordinates.");

  const zoning = getZoningForCoords(coords.x, coords.y, zoningData);
  const overlays = getOverlaysForCoords(coords.x, coords.y, overlayData);

  return {
    address,
    source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
    scrapedAt: new Date().toISOString(),
    data: {
      coordinates: coords,
      zoning,
      overlays,
    },
  };
}

// --- ROUTES ---

// Base route
app.get("/", (req, res) => {
  res.send("✅ Amenia Scraper API is live! Use /scrape?address=YOUR_ADDRESS");
});

// Scrape endpoint
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  try {
    const result = await scrapeAddress(address);
    res.json(result);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Amenia Scraper running on port ${port}`);
});