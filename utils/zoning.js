import fs from "fs";
import * as turf from "@turf/turf";

const zoningData = JSON.parse(fs.readFileSync("./utils/zoning.geojson", "utf8"));
console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);

export function getZoning(x, y) {
  const xNum = Number(x);
  const yNum = Number(y);

  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getZoning:", { x, y });
    return null;
  }

  const point = turf.point([xNum, yNum]);

  // Check direct match
  let match = zoningData.features.find(f => turf.booleanPointInPolygon(point, f));

  // 🧭 If not found, try with small buffer (10 meters)
  if (!match) {
    const bufferedPoint = turf.buffer(point, 0.0001, { units: "degrees" });
    match = zoningData.features.find(f => turf.booleanIntersects(bufferedPoint, f));
  }

  if (!match) {
    console.warn("⚠️ No zoning match found for coords:", { xNum, yNum });
    return null;
  }

  return {
    code: match.properties?.District || match.properties?.ZoningCode || null,
    description: match.properties?.ZoningDescription || match.properties?.DistrictName || null,
    municipality: match.properties?.Municipality || null,
  };
}