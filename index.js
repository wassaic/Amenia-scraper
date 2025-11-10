import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { findAddressCoords } from "./utils/addressPoints.js";
import { getZoning } from "./utils/zoning.js";
import { getOverlays } from "./utils/overlays.js";

const app = express();
const PORT = process.env.PORT || 8787;

puppeteer.use(StealthPlugin());

// Utility to safely extract text from the page
async function getText(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    const text = await page.$eval(selector, (el) => el.innerText.trim());
    return text || null;
  } catch {
    return null;
  }
}

// A cross-compatible “sleep”
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing address parameter" });
  }

  console.log(`\n🌐 Scraping + zoning/overlay lookup for: ${address}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    // Go to GIS site
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/", {
      waitUntil: "domcontentloaded",
    });

    // Clear, type address slowly, and wait for suggestions
    await page.waitForSelector("#omni-address", { timeout: 15000 });
    await page.click("#omni-address", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type("#omni-address", address, { delay: 100 });

    // Wait for dropdown or validation (the site does async lookup)
    await page.waitForFunction(
      () => {
        const suggestions = document.querySelectorAll(
          ".esri-search__suggestions li, .suggestions li"
        );
        return (
          suggestions.length > 0 ||
          document.querySelector("button.report-link.gold")
        );
      },
      { timeout: 15000 }
    );

    // Give a short buffer for internal geocoder
    await delay(800);

    // Press Enter to confirm the selected address
    await page.keyboard.press("Enter");

    // Wait for report button
    await page.waitForSelector("button.report-link.gold", { timeout: 30000 });
    await delay(500);
    await page.click("button.report-link.gold");

    // Wait for report to load
    await page.waitForSelector("#report", { timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector(".spinner"), {
      timeout: 20000,
    });

    console.log("📄 Extracting report details...");

    // Scrape text content
    const parcelGrid = await getText(page, ".parcelgrid.cell b");
    const schoolDistrict = await getText(page, ".school-district.cell b");
    const roadAuthority = await getText(page, ".road-authority.cell p");
    const fireStation = await getText(page, ".fire-station.cell");
    const legislator = await getText(page, ".dcny-legislator.cell");

    // Get coordinates from local addressPoints.geojson
    const coords = findAddressCoords(address);
    console.log("📍 Debug coords output:", coords);
    if (coords)
      console.log(
        `📍 Found coords ${coords.x}, ${coords.y} (${coords.municipality})`
      );
    else console.warn("⚠️ No coordinates found locally");

    // Lookup zoning and overlays
    let zoning = { code: null, description: null, municipality: null };
    let overlays = [];

    if (coords && !isNaN(coords.x) && !isNaN(coords.y)) {
      zoning = getZoning(coords.x, coords.y);
      overlays = getOverlays(coords.x, coords.y);
      if (!Array.isArray(overlays)) overlays = [overlays];
    } else {
      console.error("❌ Invalid coordinate numbers:", coords);
    }

    // ✅ Format overlay data
    const formattedOverlays = overlays.map((o) => ({
      district: o?.DistrictName || o?.district || null,
      fullDistrict: o?.FullDistrictName || o?.fullDistrict || null,
      subDistrict: o?.SubDistrictName || o?.subDistrict || null,
      municipality: o?.Municipality || o?.municipality || null,
      swis: o?.Swis || o?.swis || null,
      confidence:
        o?.confidence ??
        (o?.distanceMeters
          ? Math.max(0, 100 - o.distanceMeters / 10).toFixed(1)
          : null),
    }));

    // Build final structured response
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

// Start local API server
app.listen(PORT, () => {
  console.log(`✅ Amenia Scraper running on port ${PORT}`);
  console.log(`🧭 Try: curl "http://localhost:${PORT}/scrape?address=10%20Main%20St%20Amenia%20NY"`);
});