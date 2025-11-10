// utils/zoning.js
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

// ✅ Build path relative to this file, safe for Render
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
 * Finds zoning information for given coordinates (x, y)
 */
export function getZoning(x, y) {
  const xNum = parseFloat(x);
  const yNum = parseFloat(y);

  console.log("📊 Zoning input types:", typeof x, typeof y);
  console.log("📊 Parsed zoning coords:", xNum, yNum);

  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getZoning:", { x, y });
    return null;
  }

  const point = turf.point([xNum, yNum]);
  const match = zoningData?.features.find((f) => {
    try {
      return turf.booleanPointInPolygon(point, f);
    } catch (err) {
      console.error("⚠️ Error testing zoning polygon:", err.message);
      return false;
    }
  });

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