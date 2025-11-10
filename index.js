// index.js — Render & Local compatible Amenia Scraper

import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import { findAddressCoords } from "./utils/addressPoints.js";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";

const app = express();
const PORT = process.env.PORT || 10000;

puppeteer.use(StealthPlugin());

// ✅ Robust getText helper to avoid detached element issues
async function getText(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 15000 });
    const text = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerText.trim() : null;
    }, selector);
    return text || null;
  } catch {
    return null;
  }
}

app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address parameter" });

  console.log(`\n🌐 Scraping + zoning/overlay lookup for: ${address}`);

  // ✅ Auto-detect environment (Render or Local)
  const isRender = !!process.env.RENDER;
  const launchOptions = isRender
    ? {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      }
    : {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    // Go to GIS site
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "domcontentloaded",
    });

    // Type address
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.type("#omni-address", address, { delay: 50 });
    await page.keyboard.press("Enter");

    // Wait for the report button
    await page.waitForSelector("button.report-link.gold", { timeout: 20000 });
    await page.click("button.report-link.gold");

    // Wait for report content
    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), {
      timeout: 20000,
    });

    console.log("📄 Extracting report details...");

    // Scrape report data
    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // Get coordinates from local dataset
    const coords = findAddressCoords(address); console.log("📍 Debug coords output:", coords);

if (!coords || typeof coords.x !== "number" || typeof coords.y !== "number") {
  console.error("❌ Invalid coordinates received:", coords);
  return res.status(500).json({
    error: "Could not determine valid coordinates from addressPoints.geojson",
    debug: coords,
  });
}

    if (coords)
      console.log(`📍 Found coords ${coords.x}, ${coords.y} (${coords.municipality})`);
    else console.warn("⚠️ No coordinates found locally");

    // Lookup zoning + overlays from local GeoJSON
    let zoning = null;
    let overlays = [];
    if (coords && coords.x && coords.y) {
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
      if (!Array.isArray(overlays)) overlays = [overlays];
    }

    const formattedOverlays = overlays.map((o) => ({
      district: o?.DistrictName || null,
      fullDistrict: o?.FullDistrictName || null,
      subDistrict: o?.SubDistrictName || null,
      municipality: o?.Municipality || null,
      swis: o?.Swis || null,
    }));

    const scrapedData = {
      address,
      source:
        "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        parcelGrid,
        schoolDistrict,
        roadAuthority,
        fireStation,
        legislator,
        coordinates: coords,
        zoning,
        overlays: formattedOverlays,
      },
    };

    console.log("✅ Scraped Data:\n", JSON.stringify(scrapedData, null, 2));
    res.json(scrapedData);
  } catch (err) {
    console.error("❌ Scraper failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper running at http://localhost:${PORT}`);
  console.log(
    `🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`
  );
});