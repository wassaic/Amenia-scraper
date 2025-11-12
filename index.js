import fs from "fs";
import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import pkg from "puppeteer";
const { executablePath } = pkg;

import { findAddressCoords } from "./utils/addressPoints.js";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";

// 🕵️ Enable stealth mode
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 10000;

// Simple delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isExecutable = (candidate) => {
  try {
    const stats = fs.statSync(candidate);
    if (!stats.isFile()) return false;
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const resolveChromiumPath = () => {
  const candidates = [
    executablePath(),
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isExecutable(candidate)) return candidate;
  }

  return null;
};

async function getText(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    return await page.$eval(selector, (el) => el.innerText.trim());
  } catch {
    return null;
  }
}

app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address parameter" });

  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  let browser;
  try {
    // ✅ Detect proper Chromium path
    const chromePath = resolveChromiumPath();

    console.log(`🧭 Using Chromium path: ${chromePath}`);

    if (!chromePath || chromePath.trim() === "") {
      throw new Error("❌ Chromium executable not found — please install or set PUPPETEER_EXECUTABLE_PATH.");
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // 🧭 Visit Dutchess GIS site
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", { waitUntil: "domcontentloaded" });

    // ⌨️ Type the address carefully
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.focus("#omni-address");
    await page.keyboard.type(address, { delay: 75 });
    await delay(1000);
    await page.keyboard.press("Enter");

    // Wait for and click the report button
    await page.waitForSelector("button.report-link.gold", { timeout: 25000 });
    await delay(1000);
    await page.click("button.report-link.gold");

    // Wait for report to load
    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), { timeout: 20000 });

    console.log("📄 Extracting report details...");

    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    const coords = findAddressCoords(address);
    let zoning = { code: null, description: null, municipality: null };
    let overlays = [];

    if (coords && !isNaN(coords.x) && !isNaN(coords.y)) {
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
      if (!Array.isArray(overlays)) overlays = [overlays];
    }

    const formattedOverlays = overlays.map((o) => ({
      district: o?.district || o?.DistrictName || null,
      fullDistrict: o?.fullDistrict || o?.FullDistrictName || null,
      subDistrict: o?.subDistrict || o?.SubDistrictName || null,
      municipality: o?.municipality || o?.Municipality || null,
      swis: o?.swis || o?.Swis || null,
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

    res.json(scrapedData);
  } catch (err) {
    console.error("❌ Scraper failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// ✅ Add a health check route for Render
app.get("/", (req, res) => {
  res.json({ status: "✅ Amenia Scraper is live", time: new Date().toISOString() });
});

// ✅ Start Express server
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper running on port ${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});
