import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";
import { findAddressCoords } from "./utils/addressPoints.js";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";

const app = express();
const PORT = process.env.PORT || 10000;

// 🕵️ Add stealth plugin
puppeteer.use(StealthPlugin());

// 🕑 Small delay utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ✅ Utility to safely get text from a page
async function getText(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    const text = await page.$eval(selector, (el) => el.innerText.trim());
    return text || null;
  } catch {
    return null;
  }
}

// ✅ Scraper route
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address parameter" });

  console.log(`\n🌐 Scraping + zoning/overlay lookup for: ${address}`);

  let browser;
  try {
    // 🚀 Launch Puppeteer safely for Render
    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath(), // ✅ use bundled Chromium path
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // 🔎 Go to the Dutchess GIS Address Info Finder
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "domcontentloaded",
    });

    // ⌨️ Type address fully before submit
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.focus("#omni-address");
    await page.keyboard.type(address, { delay: 75 });
    await delay(800);
    await page.keyboard.press("Enter");

    // 🕒 Wait for report link
    await page.waitForSelector("button.report-link.gold", { timeout: 20000 });
    await delay(800);
    await page.click("button.report-link.gold");

    // 📑 Wait for report data
    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), {
      timeout: 20000,
    });

    console.log("📄 Extracting report details...");

    // 🧭 Extract visible data
    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // 🗺️ Get coordinates from local file
    const coords = findAddressCoords(address);
    console.log("📍 Debug coords output:", coords);

    if (!coords) console.warn("⚠️ No coordinates found locally");

    // 🧩 Lookup zoning + overlays
    let zoning = { code: null, description: null, municipality: null };
    let overlays = [];

    if (coords && !isNaN(coords.x) && !isNaN(coords.y)) {
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
      if (!Array.isArray(overlays)) overlays = [overlays];
    }

    // 🧱 Clean overlay fields
    const formattedOverlays = overlays.map((o) => ({
      district: o?.DistrictName || o?.district || null,
      fullDistrict: o?.FullDistrictName || o?.fullDistrict || null,
      subDistrict: o?.SubDistrictName || o?.subDistrict || null,
      municipality: o?.Municipality || o?.municipality || null,
      swis: o?.Swis || o?.swis || null,
    }));

    // 🧾 Build response
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

// ✅ Start the API
app.listen(PORT, () => {
  console.log(`✅ Loaded addressPoints.geojson with 107479 address points.`);
  console.log(`✅ Loaded zoning.geojson with 360 features.`);
  console.log(`✅ Loaded overlays.geojson with 75 features.`);
  console.log(`✅ Amenia Scraper running on port ${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});