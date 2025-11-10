// utils/overlays.js
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

const overlayPath = path.resolve("./utils/overlays.geojson");
let overlayData = null;

try {
  const raw = fs.readFileSync(overlayPath, "utf8");
  overlayData = JSON.parse(raw);
  console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load overlays.geojson:", err.message);
}

/**
 * Return overlay districts intersecting given coordinates
 */
export function getOverlaysForCoords(lon, lat, data = overlayData) {
  if (!data) return [];
  const point = turf.point([lon, lat]);
  const matches = data.features.filter(f => turf.booleanPointInPolygon(point, f));

  return matches.map(f => ({
    district: f.properties?.DistrictName || null,
    fullDistrict: f.properties?.FullDistrictName || null,
    subDistrict: f.properties?.SubDistrictName || null,
    municipality: f.properties?.Municipality || null,
    swis: f.properties?.Swis || null
  }));
}