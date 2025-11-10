import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

// ✅ Build absolute path (macOS + Render)
const overlayPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "overlays.geojson"
);

let overlayData = null;

try {
  const raw = fs.readFileSync(overlayPath, "utf8");
  overlayData = JSON.parse(raw);
  console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load overlays.geojson:", err.message);
}

/**
 * Lookup overlay districts for given coordinates.
 * @param {number} x - Longitude
 * @param {number} y - Latitude
 * @returns {Array<object>} - Overlay results
 */
export function getOverlays(x, y) {
  if (!overlayData) {
    console.error("⚠️ Overlay data not loaded.");
    return [];
  }

  const xNum = Number(x);
  const yNum = Number(y);
  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getOverlays:", { x, y });
    return [];
  }

  const point = turf.point([xNum, yNum]);
  console.log(`📍 Checking overlays for coordinates: ${xNum}, ${yNum}`);

  const matches = overlayData.features.filter((f) => {
    try {
      return turf.booleanPointInPolygon(point, f.geometry);
    } catch {
      return false;
    }
  });

  if (matches.length > 0) {
    matches.forEach((f) => {
      const props = f.properties || {};
      console.log(
        `🏞️ Overlay match found: ${props.FullDistrictName || props.DistrictName || "Unnamed Overlay"}`
      );
    });
  } else {
    console.warn(`⚠️ No overlay match found for coordinates: ${xNum}, ${yNum}`);
  }

  return matches.map((f) => {
    const props = f.properties || {};
    return {
      district: props.DistrictName || null,
      fullDistrict: props.FullDistrictName || null,
      subDistrict: props.SubDistrictName || null,
      municipality: props.Municipality || null,
      swis: props.Swis || null,
    };
  });
}