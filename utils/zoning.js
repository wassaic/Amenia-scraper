import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

// Resolve file path properly for Render
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
 * Get zoning info for given WGS84 coordinates
 */
export function getZoning(x, y) {
  const xNum = Number(x);
  const yNum = Number(y);

  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid zoning coordinates:", { x, y });
    return null;
  }

  const point = turf.point([xNum, yNum]);

  // buffer ~15 meters in case parcel straddles a zone border
  const buffer = turf.buffer(point, 0.015, { units: "kilometers" });

  const match = zoningData.features.find(f =>
    turf.booleanIntersects(buffer, f)
  );

  if (!match) {
    console.warn("⚠️ No zoning match found for coordinates:", { xNum, yNum });
    return { code: null, description: null, municipality: null };
  }

  return {
    code: match.properties?.CODE || null,
    description: match.properties?.DESCRIPTION || match.properties?.ZONEDESC || null,
    municipality: match.properties?.MUNICIPALITY || null
  };
}