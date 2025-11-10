// index.js – Final Working Amenia Scraper Build
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import * as turf from "@turf/turf";

// Puppeteer setup for Render
puppeteer.use(StealthPlugin());
chromium.setHeadlessMode = true;

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Load GeoJSON safely
function loadGeoJSON(filename) {
  const fullPath = path.join(__dirname, "utils", filename);
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    console.log(`✅ Loaded ${filename} with ${data.features.length} features.`);
    return data;
  } catch (err) {
    console.error(`❌ Failed to load ${filename}:`, err.message);
    return { features: [] };
  }
}

// Load local datasets
const zoningData = loadGeoJSON("zoning.geojson");
const overlayData = loadGeoJSON("overlays.geojson");
const addressPoints = loadGeoJSON("addressPoints.geojson");

// Utility: find zoning by coordinate
function getZoningForCoords(lon, lat) {
  const point = turf.point([lon, lat]);
  for (const feature of zoningData.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      const p = feature.properties;
      return {
        code: p.ZONE || p.zone || p.Code || null,
        description: p.DESC || p.desc || p.Description || null,
        municipality: p.TOWN || p.Municipality || null,
        parcelGrid: p.ParcelID || p.PARCELID || null,
      };
    }
  }
  return { code: null, description: null, municipality: null, parcelGrid: null };
}

// Utility: find overlays by coordinate
function getOverlaysForCoords(lon, lat) {
  const point = turf.point([lon, lat]);
  const matches = [];
  for (const feature of overlayData.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      const p = feature.properties;
      matches.push({
        district: p.DistrictName || p.DISTRICT || null,
        fullDistrict: p.FullDistrictName || p.FULLDISTRICT || null,
        subDistrict: p.SubDistrictName || p.SUBDISTRICT || null,
        municipality: p.Municipality || p.TOWN || null,
        swis: p.Swis || p.SWIS || null,
      });
    }
  }
  return matches;
}

// Utility: find coordinates by parcel ID or address
function getCoordsForParcel(parcelId, address) {
  const normalizedAddr = address.toLowerCase().trim();
  const match = addressPoints.features.find((f) => {
    const props = f.properties || {};
    const pid = props.ParcelID || props.PARCELID || "";
    const addr = props.FullAddress?.toLowerCase().trim() || "";
    return pid === parcelId || addr === normalizedAddr;
  });
  if (!match) return null;
  const [x, y] = match.geometry.coordinates;
  return { x, y };
}

// Express app setup
const app = express();
const PORT = process.env.PORT || 10000;

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "✅ OK",
    message: "Amenia Scraper API is live",
    usage: "/scrape?address=10%20Main%20St%20Amenia%20NY",
  });
});

// Main scrape endpoint
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  console.log(`🌐 Scraping for address: ${address}`);

  try {
    // Launch Puppeteer with Render-compatible Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "networkidle2",
    });

    // Input address into search
    await page.waitForSelector("#omni-address", { timeout: 20000 });
    await page.type("#omni-address", address);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(5000);

    // Extract Parcel ID from page text
    const parcelId = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/Parcel\s*ID:\s*([\w-]+)/i);
      return match ? match[1] : null;
    });

    await browser.close();

    if (!parcelId) {
      return res.status(404).json({
        error: "Could not locate Parcel ID for that address.",
      });
    }

    console.log(`🧾 Found Parcel ID: ${parcelId}`);

    // Get coordinates from local addressPoints
    const coords = getCoordsForParcel(parcelId, address);
    if (!coords) {
      return res.status(404).json({
        error: "Coordinates not found in local dataset for this Parcel ID.",
        parcelId,
      });
    }

    // Match zoning & overlays
    const zoning = getZoningForCoords(coords.x, coords.y);
    const overlays = getOverlaysForCoords(coords.x, coords.y);

    // Construct final JSON response
    const result = {
      address,
      parcelId,
      source:
        "Dutchess County GIS Address Info Finder + Local AddressPoints + Amenia Zoning Overlays",
      scrapedAt: new Date().toISOString(),
      data: {
        coordinates: coords,
        zoning,
        overlays,
      },
    };

    console.log("✅ Scraped Data:", JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error("❌ Scraper error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper running on http://localhost:${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});