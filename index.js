import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";
import { fileURLToPath } from "url";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";
import { findAddressCoords } from "./utils/addressPoints.js";

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 10000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* -------------------- Load GeoJSONs -------------------- */
function loadGeoJSON(fileName, label) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "utils", fileName), "utf8"));
    console.log(`✅ Loaded ${label} with ${data.features.length} features.`);
    return data;
  } catch (err) {
    console.error(`❌ Failed to load ${label}: ${err.message}`);
    return null;
  }
}

const zoningData = loadGeoJSON("zoning.geojson", "zoning.geojson");
const overlayData = loadGeoJSON("overlays.geojson", "overlays.geojson");
const addressData = loadGeoJSON("addressPoints.geojson", "addressPoints.geojson");

/* -------------------- Puppeteer Scraper -------------------- */
async function scrapeAddressInfo(address) {
  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "/usr/bin/chromium-browser",
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

  try {
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", { waitUntil: "networkidle2" });

    // 🧭 Input the address
    console.log("⌛ Typing address...");
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.type("#omni-address", address, { delay: 50 });
    await page.keyboard.press("Enter");

    console.log("⌛ Waiting for report content...");
    await page.waitForSelector("#report", { timeout: 25000 });

    // ✅ Extract info from the report
    console.log("📄 Extracting report details...");
    const extractedData = await page.evaluate(() => {
      const text = document.body.innerText;

      const parcelGridMatch = text.match(/Grid Number:\s*([0-9A-Z]+)/i);
      const schoolDistrictMatch = text.match(/School District:\s*(.*)/i);
      const roadAuthorityMatch = text.match(/Road Authority:\s*(.*)/i);
      const fireStationMatch = text.match(/Fire District:\s*(.*)/i);
      const legislatorMatch = text.match(/Legislator:\s*(.*)/i);

      return {
        parcelGrid: parcelGridMatch ? parcelGridMatch[1].trim() : null,
        schoolDistrict: schoolDistrictMatch ? schoolDistrictMatch[1].trim() : null,
        roadAuthority: roadAuthorityMatch ? roadAuthorityMatch[1].trim() : null,
        fireStation: fireStationMatch ? fireStationMatch[1].trim() : null,
        legislator: legislatorMatch ? legislatorMatch[1].trim() : null
      };
    });

    // 🧭 Find local coordinates
    const coords = findAddressCoords(address, addressData);
    if (!coords) {
      console.warn("⚠️ No local coordinates found.");
    } else {
      console.log(`📍 Found coords ${coords.x}, ${coords.y} (${coords.municipality})`);
    }

    // 🏗️ Zoning + overlay lookups
    const zoning = coords ? getZoning(coords.x, coords.y, zoningData) : null;
    const overlays = coords ? getOverlays(coords.x, coords.y, overlayData) : [];

    const finalData = {
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        ...extractedData,
        coordinates: coords,
        zoning: zoning || null,
        overlays: overlays || []
      }
    };

    console.log("✅ Scraped Data:\n", JSON.stringify(finalData, null, 2));
    return finalData;
  } catch (err) {
    console.error("❌ Scrape failed:", err.message);
    return { error: err.message };
  } finally {
    await browser.close();
  }
}

/* -------------------- Express Endpoint -------------------- */
app.get("/scrape", async (req, res) => {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  const result = await scrapeAddressInfo(address);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper fully local or cloud at http://localhost:${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});