// utils/overlays.js
import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";

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
 * Find overlay districts intersecting the given coordinate
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @param {object} data - Optional GeoJSON override
 */
export function getOverlaysForCoords(lon, lat, data = overlayData) {
  if (!data) return [];

  const point = turf.point([lon, lat]);
  const results = data.features.filter(f => turf.booleanPointInPolygon(point, f));

  if (!results.length) {
    return [];
  }

  return results.map(f => ({
    district: f.properties.DistrictName || null,
    fullDistrict: f.properties.FullDistrictName || null,
    subDistrict: f.properties.SubDistrictName || null,
    municipality: f.properties.Municipality || null,
    swis: f.properties.Swis || null
  }));
}