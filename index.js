import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";

// --- Load local data files ---
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load GeoJSON files manually
const zoningData = JSON.parse(fs.readFileSync(path.join(__dirname, "utils/zoning.geojson"), "utf-8"));
const overlaysData = JSON.parse(fs.readFileSync(path.join(__dirname, "utils/overlays.geojson"), "utf-8"));
const addressPoints = JSON.parse(fs.readFileSync(path.join(__dirname, "utils/addressPoints.geojson"), "utf-8"));

// --- Server setup ---
const app = express();
const PORT = process.env.PORT || 10000;

// --- Puppeteer Chromium path ---
const chromePath = process.env.CHROMIUM_PATH || (await chromium.executablePath());

// --- Turf.js: Zoning lookup ---
function getZoningForCoords(lon, lat) {
  const point = turf.point([lon, lat]);
  for (const feature of zoningData.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      const props = feature.properties;
      return {
        code: props.Zone_Label || props.ZONE || props.Zone_Code || null,
        description: props.Zone_Description || props.Description || props.Desc || null,
        municipality: props.Municipality || props.TOWN || props.Town_Name || null,
        parcelGrid: props.Parcel_ID || props.ParcelGrid || props.PARCEL || null
      };
    }
  }
  return null;
}

// --- Turf.js: Overlay lookup ---
function getOverlaysForCoords(lon, lat) {
  const point = turf.point([lon, lat]);
  return overlaysData.features
    .filter(f => turf.booleanPointInPolygon(point, f))
    .map(f => ({
      district: f.properties.DistrictName || f.properties.DISTRICT || null,
      fullDistrict: f.properties.FullDistrictName || f.properties.FULL_DISTRICT || null,
      subDistrict: f.properties.SubDistrictName || f.properties.SubDistrict || null,
      municipality: f.properties.Municipality || f.properties.TOWN || null,
      swis: f.properties.Swis || f.properties.SWIS || null
    }));
}

// --- Helper: Find address coordinates locally ---
function getAddressCoords(address) {
  const normalized = address.toUpperCase().replace(/\s+/g, " ").trim();
  const record = addressPoints.features.find(f => {
    const addr = f.properties.FULLADDRESS?.toUpperCase() || "";
    return addr.includes(normalized);
  });
  if (record) {
    return {
      x: record.geometry.coordinates[0],
      y: record.geometry.coordinates[1],
      fullAddress: record.properties.FULLADDRESS,
      municipality: record.properties.MUNICIPALITY
    };
  }
  return null;
}

// --- Puppeteer Scraper (Dutchess GIS site) ---
async function scrapeAddressInfo(address) {
  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  // Wait for and type address
  await page.waitForSelector("#omni-address", { visible: true });
  await page.type("#omni-address", address, { delay: 100 });

  // Wait for suggestion + click
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);

  // Get report info
  const content = await page.content();
  const parcelMatch = content.match(/Parcel\s+ID[:\s]+([\d-]+)/i);
  const parcelGrid = parcelMatch ? parcelMatch[1].trim() : null;

  await browser.close();

  // Get coordinates locally
  const coords = getAddressCoords(address);
  if (!coords) throw new Error("No coordinates found for address");

  // Turf lookups
  const zoning = getZoningForCoords(coords.x, coords.y);
  const overlays = getOverlaysForCoords(coords.x, coords.y);

  return {
    address,
    source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
    scrapedAt: new Date().toISOString(),
    data: {
      parcelGrid,
      coordinates: coords,
      zoning,
      overlays
    }
  };
}

// --- Express Route ---
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing ?address= parameter" });

  try {
    const result = await scrapeAddressInfo(address);
    res.json(result);
  } catch (err) {
    console.error("❌ Scrape failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Health check endpoint ---
app.get("/", (req, res) => {
  res.json({
    status: "✅ OK",
    message: "Amenia Scraper API is live and responding",
    endpoints: ["/scrape?address=<address>"]
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper running on port ${PORT}`);
});