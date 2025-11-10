import fs from "fs";
import * as turf from "@turf/turf";

const zoningData = JSON.parse(fs.readFileSync("./utils/zoning.geojson", "utf8"));
console.log(`✅ Loaded zoning.geojson with ${zoningData.features.length} features.`);

export function getZoningForCoords(coords) {
  const point = turf.point([coords.x, coords.y]);
  const feature = zoningData.features.find((f) =>
    turf.booleanPointInPolygon(point, f)
  );

  if (!feature) return { code: null, description: null, municipality: null };

  return {
    code: feature.properties.Zone_Label || null,
    description: feature.properties.Zone_Description || null,
    municipality: feature.properties.Municipality || null,
  };
}