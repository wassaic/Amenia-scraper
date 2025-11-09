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
 * Lookup zoning information for given coordinates.
 * @param {number} x - Longitude
 * @param {number} y - Latitude
 * @returns {object} - Zoning info { code, description, municipality }
 */
export function getZoning(x, y) {
  if (!zoningData) return { code: null, description: null, municipality: null };

  const point = turf.point([x, y]);

  for (const feature of zoningData.features) {
    try {
      if (turf.booleanPointInPolygon(point, feature.geometry)) {
        return {
          code: feature.properties?.Zone_Label || feature.properties?.ZONE_CODE || null,
          description: feature.properties?.Zone_Description || feature.properties?.ZONE_DESC || null,
          municipality: feature.properties?.Municipality || feature.properties?.TOWN || null
        };
      }
    } catch {
      // skip invalid polygon
    }
  }

  // No match found
  return { code: null, description: null, municipality: null };
}