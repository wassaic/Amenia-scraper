// index.js – Final Render-Ready Version
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import * as turf from "@turf/turf";

// Puppeteer setup
puppeteer.use(StealthPlugin());

// Path setup for local data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local GeoJSON data safely
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

const zoningData = loadGeoJSON("zoning.geojson");
const overlayData = loadGeoJSON("overlays.geojson");
const addressData = loadGeoJSON("addressPoints.geojson");

// Utility: find zoning by coordinate
function getZoningForCoords(lon, lat) {
  const point = turf.point([lon, lat]);
  for (const feature of zoningData.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      const props = feature.properties;
      return {
        code: props.ZONE || props.zone || props.Code || null,
        description: props.DESC || props.desc || props.Description || null,
        municipality: props.TOWN || props.Municipality || null,
        parcelGrid: props.ParcelID || props.PARCELID || null,
      };
    }
  }
  return { code: null, description: null, municipality: null, parcelGrid: null };
}

// Utility: find overlay(s) by coordinate
function getOverlaysForCoords(lon, lat) {
  const point = turf.point([lon, lat]);
  const matches = [];
  for (const feature of overlayData.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      const props = feature.properties;
      matches.push({
        district: props.DistrictName || props.DISTRICT || null,
        fullDistrict: props.FullDistrictName || props.FULLDISTRICT || null,
        subDistrict: props.SubDistrictName || props.SUBDISTRICT || null,
        municipality: props.Municipality || props.TOWN || null,
        swis: props.Swis || props.SWIS || null,
      });
    }
  }
  return matches;
}

// Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Health endpoint
app.get("/", (req, res) => {
  res.json({
    status: "✅ OK",
    message: "Amenia Scraper API is live and responding",
    endpoints: ["/scrape?address=<address>"],
  });
});

// Scrape endpoint
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  try {
    // Launch Puppeteer on Render with Chromium binary
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

    // Input address in the correct search box
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.type("#omni-address", address);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(4000);

    // Extract coordinates from the JS context
    const coords = await page.evaluate(() => {
      const mapEl = document.querySelector("#map");
      if (!mapEl) return null;
      const text = mapEl.innerText || "";
      const match = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (match) {
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      }
      return null;
    });

    await browser.close();

    if (!coords) {
      return res.status(404).json({ error: "Could not extract coordinates." });
    }

    const zoning = getZoningForCoords(coords.x, coords.y);
    const overlays = getOverlaysForCoords(coords.x, coords.y);

    const result = {
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
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
  console.log(`✅ Amenia Scraper fully local or cloud at http://localhost:${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});