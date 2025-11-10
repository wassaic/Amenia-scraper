import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

// ✅ Build absolute path (works on macOS + Render)
const zoningPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "zoning.geojson"
);

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
  if (!zoningData) {
    console.error("⚠️ Zoning data not loaded.");
    return { code: null, description: null, municipality: null };
  }

  const xNum = Number(x);
  const yNum = Number(y);
  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getZoning:", { x, y });
    return { code: null, description: null, municipality: null };
  }

  const point = turf.point([xNum, yNum]);
  console.log(`📍 Checking zoning for coordinates: ${xNum}, ${yNum}`);

  for (const feature of zoningData.features) {
    try {
      if (turf.booleanPointInPolygon(point, feature.geometry)) {
        const props = feature.properties || {};

        const result = {
          code:
            props.Zone_Label ||
            props.ZONE_CODE ||
            props.ZoningCode ||
            props.Zoning ||
            null,
          description:
            props.Zone_Description ||
            props.ZONE_DESC ||
            props.ZoningDesc ||
            props.Description ||
            null,
          municipality:
            props.Municipality || props.TOWN || props.Town || "Amenia",
        };

        console.log(
          `🏠 Zoning match found in ${result.municipality}: ${result.code || "Unknown"} (${result.description || "No description"})`
        );

        return result;
      }
    } catch (err) {
      // Skip bad polygon data
    }
  }

  console.warn(`⚠️ No zoning match found for coordinates: ${xNum}, ${yNum}`);
  return { code: null, description: null, municipality: null };
}