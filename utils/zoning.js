// utils/zoning.js
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

const zoningPath = path.resolve("./utils/zoning.geojson");
let zoningData = null;

try {
  const raw = fs.readFileSync(zoningPath, "utf8");
  zoningData = JSON.parse(raw);
  console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load zoning.geojson:", err.message);
}

/**
 * Return zoning data for given coordinates
 */
export function getZoningForCoords(lon, lat, data = zoningData) {
  if (!data) return null;
  const point = turf.point([lon, lat]);
  const match = data.features.find(f => turf.booleanPointInPolygon(point, f));
  if (!match) return null;

  const props = match.properties || {};
  return {
    code: props.Zone_Label || props.ZONE_CODE || null,
    description: props.Zone_Description || props.ZONE_DESC || null,
    municipality: props.Municipality || props.TOWN || null
  };
}