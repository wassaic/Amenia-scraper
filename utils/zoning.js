import fs from "fs";
import * as turf from "@turf/turf";

// Load the zoning GeoJSON file
const zoningData = JSON.parse(fs.readFileSync("./utils/zoning.geojson", "utf8"));
console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);

// Main function to find the zoning district for given coordinates
export function getZoning(x, y) {
  const point = turf.point([x, y]);
  const match = zoningData.features.find((f) => turf.booleanPointInPolygon(point, f));

  if (!match) return null;

  return {
    code: match.properties.ZoningCode || null,
    description: match.properties.ZoningDesc || null,
    municipality: match.properties.Municipality || null,
  };
}