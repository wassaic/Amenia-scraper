// utils/overlays.js
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

// ✅ Build path relative to this file, safe for Render
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
 * Returns overlays that intersect with given coordinates (x, y)
 */
export function getOverlays(x, y) {
  const xNum = parseFloat(x);
  const yNum = parseFloat(y);

  console.log("📊 Overlay input types:", typeof x, typeof y);
  console.log("📊 Parsed overlay coords:", xNum, yNum);

  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getOverlays:", { x, y });
    return [];
  }

  const point = turf.point([xNum, yNum]);
  const matches = overlayData?.features.filter((f) => {
    try {
      return turf.booleanPointInPolygon(point, f);
    } catch (err) {
      console.error("⚠️ Error testing overlay polygon:", err.message);
      return false;
    }
  }) || [];

  return matches.map((f) => ({
    DistrictName: f.properties?.DistrictName || null,
    FullDistrictName: f.properties?.FullDistrictName || null,
    SubDistrictName: f.properties?.SubDistrictName || null,
    Municipality: f.properties?.Municipality || null,
    Swis: f.properties?.Swis || null,
  }));
}