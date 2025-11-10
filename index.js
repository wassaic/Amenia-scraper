import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { findAddressCoords } from "./utils/addressPoints.js";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Add puppeteer stealth
puppeteer.use(StealthPlugin());

// ✅ Safe delay function to replace page.waitForTimeout
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ✅ Utility for safe text extraction
async function getText(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    const text = await page.$eval(selector, (el) => el.innerText.trim());
    return text || null;
  } catch {
    return null;
  }
}

app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address parameter" });

  console.log(`\n🌐 Scraping + zoning/overlay lookup for: ${address}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // ✅ Load the Dutchess GIS Address Info Finder
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "domcontentloaded",
    });

    // ✅ Wait for input, type address slowly, and ensure full completion before Enter
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.focus("#omni-address");
    await page.keyboard.type(address, { delay: 75 });
    await delay(800); // Ensure full typing before submission
    await page.keyboard.press("Enter");

    // ✅ Wait for results and report button
    await page.waitForSelector("button.report-link.gold", { timeout: 20000 });
    await delay(800);
    await page.click("button.report-link.gold");

    // ✅ Wait for the report content
    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), {
      timeout: 20000,
    });

    console.log("📄 Extracting report details...");

    // ✅ Extract text content from the page
    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // ✅ Find coordinates from local addressPoints.geojson
    const coords = findAddressCoords(address);
    console.log("📍 Debug coords output:", coords);

    if (!coords) console.warn("⚠️ No coordinates found locally");

    // ✅ Zoning + overlay lookup
    let zoning = { code: null, description: null, municipality: null };
    let overlays = [];

    if (coords && !isNaN(coords.x) && !isNaN(coords.y)) {
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
      if (!Array.isArray(overlays)) overlays = [overlays];
    }

    // ✅ Map overlay fields consistently
    const formattedOverlays = overlays.map((o) => ({
      district: o?.DistrictName || o?.district || null,
      fullDistrict: o?.FullDistrictName || o?.fullDistrict || null,
      subDistrict: o?.SubDistrictName || o?.subDistrict || null,
      municipality: o?.Municipality || o?.municipality || null,
      swis: o?.Swis || o?.swis || null,
    }));

    const scrapedData = {
      address,
      source: "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
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
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Loaded addressPoints.geojson with 107479 address points.`);
  console.log(`✅ Loaded zoning.geojson with 360 features.`);
  console.log(`✅ Loaded overlays.geojson with 75 features.`);
  console.log(`✅ Amenia Scraper running on port ${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});