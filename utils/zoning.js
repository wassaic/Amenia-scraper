import fs from "fs";
import * as turf from "@turf/turf";

// Load zoning GeoJSON safely
const zoningData = JSON.parse(fs.readFileSync("./utils/zoning.geojson", "utf8"));
console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);

/**
 * Finds zoning data for given coordinates (x, y)
 */
export function getZoning(x, y) {
  const xNum = Number(x);
  const yNum = Number(y);

  // Validate coordinate numbers
  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getZoning:", { x, y });
    return null;
  }

  // Create a Turf point
  const point = turf.point([xNum, yNum]);

  // Find the first zoning polygon containing the point
  const match = zoningData.features.find((f) => {
    try {
      return turf.booleanPointInPolygon(point, f);
    } catch (err) {
      console.error("⚠️ Error testing polygon:", err.message);
      return false;
    }
  });

  // Return clean structured data
  if (!match) {
    console.warn("⚠️ No zoning match found for coordinates:", { xNum, yNum });
    return null;
  }

  return {
    code: match.properties?.CODE || null,
    description: match.properties?.DESCRIPTION || null,
    municipality: match.properties?.MUNICIPALITY || null,
  };
}