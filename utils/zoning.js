// utils/zoning.js
import fs from "fs";
import * as turf from "@turf/turf";

const zoningData = JSON.parse(fs.readFileSync("./utils/zoning.geojson", "utf8"));
console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);

/**
 * Finds the zoning district for a given coordinate.
 */
export function getZoning(x, y) {
  const xNum = parseFloat(x);
  const yNum = parseFloat(y);

  if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) {
    console.error("❌ Invalid coordinates passed to getZoning:", { x, y });
    return null;
  }

  const point = turf.point([xNum, yNum]);
  const match = zoningData.features.find(f => turf.booleanPointInPolygon(point, f));

  if (!match) {
    console.warn("⚠️ No zoning match found for coordinates:", { xNum, yNum });
    return null;
  }

  return {
    code: match.properties?.ZONE_CODE || match.properties?.Zoning || null,
    description: match.properties?.ZONE_DESC || match.properties?.Description || null,
    municipality: match.properties?.MUNICIPALITY || null,
  };
}