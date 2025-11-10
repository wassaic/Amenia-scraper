import fs from "fs";
import * as turf from "@turf/turf";

const overlayData = JSON.parse(fs.readFileSync("./utils/overlays.geojson", "utf8"));
console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);

export function getOverlaysForCoords(coords) {
  const point = turf.point([coords.x, coords.y]);
  const matches = overlayData.features.filter((f) =>
    turf.booleanPointInPolygon(point, f)
  );

  return matches.map((f) => ({
    district: f.properties.DistrictName || null,
    fullDistrict: f.properties.FullDistrictName || null,
    subDistrict: f.properties.SubDistrictName || null,
    municipality: f.properties.Municipality || null,
    swis: f.properties.Swis || null,
  }));
}