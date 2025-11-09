// utils/overlays.js
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

const overlaysPath = path.resolve("./utils/overlays.geojson");
let overlayData = null;

try {
  const raw = fs.readFileSync(overlaysPath, "utf8");
  overlayData = JSON.parse(raw);
  console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load overlays.geojson:", err.message);
}

export function getOverlays(x, y) {
  if (!overlayData) return [];

  const pt = turf.point([x, y]);

  // Find all polygons containing the point
  const matches = overlayData.features.filter((f) => {
    try {
      return turf.booleanPointInPolygon(pt, f);
    } catch {
      return false;
    }
  });

  // Map to overlay district properties
  return matches.map((f) => ({
    DistrictName: f.properties?.DistrictName || null,
    FullDistrictName: f.properties?.FullDistrictName || null,
    SubDistrictName: f.properties?.SubDistrictName || null,
    Municipality: f.properties?.Municipality || null,
    Swis: f.properties?.Swis || null,
  }));
}