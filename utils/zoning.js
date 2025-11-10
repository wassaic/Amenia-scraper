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

  // Direct match first
  let match = zoningData.features.find(f => turf.booleanPointInPolygon(point, f));

  // If not found, try buffered search (25 meters)
  if (!match) {
    const bufferedPoint = turf.buffer(point, 0.00025, { units: "degrees" });
    match = zoningData.features.find(f => turf.booleanIntersects(bufferedPoint, f));
  }

  if (!match) {
    console.warn("⚠️ No zoning match found for coords:", { xNum, yNum });
    return {
      code: null,
      description: null,
      municipality: "Amenia"
    };
  }

  return {
    code: match.properties?.District || match.properties?.ZoningCode || null,
    description: match.properties?.ZoningDescription || match.properties?.DistrictName || null,
    municipality: match.properties?.Municipality || "Amenia",
  };
}