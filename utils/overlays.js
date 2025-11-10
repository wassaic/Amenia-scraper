// utils/overlays.js
import fs from "fs";
import * as turf from "@turf/turf";

const overlayData = JSON.parse(fs.readFileSync("./utils/overlays.geojson", "utf8"));
console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);

/**
 * Finds overlay districts that intersect a coordinate.
 */
export function getOverlays(x, y) {
  const xNum = parseFloat(x);
  const yNum = parseFloat(y);

  if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) {
    console.error("❌ Invalid coordinates passed to getOverlays:", { x, y });
    return [];
  }

  const point = turf.point([xNum, yNum]);
  const matches = overlayData.features.filter(f => {
    try {
      return turf.booleanPointInPolygon(point, f);
    } catch (err) {
      console.error("⚠️ Turf error for overlay feature:", err.message);
      return false;
    }
  });

  return matches.map(f => ({
    DistrictName: f.properties?.DistrictName || null,
    FullDistrictName: f.properties?.FullDistrictName || null,
    SubDistrictName: f.properties?.SubDistrictName || null,
    Municipality: f.properties?.Municipality || null,
    Swis: f.properties?.Swis || null,
  }));
}