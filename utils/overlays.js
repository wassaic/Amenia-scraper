import fs from "fs";
import * as turf from "@turf/turf";

// Load the overlays GeoJSON file
const overlayData = JSON.parse(fs.readFileSync("./utils/overlays.geojson", "utf8"));
console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);

// Main function to get overlay districts for a given coordinate
export function getOverlays(coords) {
  const point = turf.point([coords.x, coords.y]);

  // Find all polygons that contain this point
  const matches = overlayData.features.filter((f) =>
    turf.booleanPointInPolygon(point, f)
  );

  // Return a clean object for each match
  return matches.map((f) => ({
    district: f.properties.DistrictName || null,
    fullDistrict: f.properties.FullDistrictName || null,
    subDistrict: f.properties.SubDistrictName || null,
    municipality: f.properties.Municipality || null,
    swis: f.properties.Swis || null,
  }));
}