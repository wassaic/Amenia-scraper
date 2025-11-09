import puppeteer from "puppeteer";

export async function scrapeAmeniaGIS(address) {
  console.log(`🏠 Searching for: ${address}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(40000);

  try {
    await page.goto("https://gis.dutchessny.gov/addressinfofinder/");
    await page.waitForSelector("#omni-address", { visible: true });
    await page.type("#omni-address", address);
    await page.waitForSelector("button.report-link.gold", { visible: true });
    await page.click("button.report-link.gold");

    await page.waitForSelector("#report", { visible: true, timeout: 20000 });
    console.log("✅ Report page loaded — extracting data...");

    const data = await page.evaluate(() => {
      const extract = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : null;
      };

      return {
        address: extract(".address-box .address"),
        parcelGrid: extract(".parcelgrid"),
        schoolDistrict: extract(".school-district"),
        roadAuthority: extract(".road-authority"),
        fireStation: extract(".fire-station"),
        legislator: extract(".dcny-legislator"),
        stateAssembly: extract(".nys-assembly"),
        stateSenate: extract(".nys-senate"),
        congress: extract(".us-house"),
        usSenate: extract(".us-senate")
      };
    });

    await browser.close();
    return data;
  } catch (err) {
    await browser.close();
    console.error("❌ Scraping failed:", err.message);
    throw err;
  }
}
