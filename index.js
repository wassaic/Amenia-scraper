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

// Helper for safely scraping text
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

  console.log(`🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: chromium.defaultViewport,
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    // Load Dutchess County GIS site
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "domcontentloaded",
    });

    // Search for address
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

    // Scrape key details from report
    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // Extract parcel ID directly from the report
    const parcelId = await page.evaluate(() => {
      const el = document.querySelector(".parcelid.cell b");
      return el ? el.innerText.trim() : null;
    });

    // Get coordinates using local GeoJSON lookup
    const coords = findAddressCoords(address);
    if (coords) {
      console.log(`📍 Found coords ${coords.x}, ${coords.y} (${coords.municipality})`);
    } else {
      console.warn("⚠️ No coordinates found locally");
    }

    // Lookup zoning and overlays
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

    // ✅ Build structured response
    const result = {
      address,
      source: "Dutchess County GIS + Local Zoning + Overlay Districts",
      scrapedAt: new Date().toISOString(),
      data: {
        parcelId,
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

    console.log("✅ Scraped Data:", JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error("❌ Scraper failed:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper running on port ${PORT}`);
  console.log(
    `🧭 Try: curl "https://amenia-scraper-api.onrender.com/scrape?address=10%20Main%20St%20Amenia%20NY"`
  );
});