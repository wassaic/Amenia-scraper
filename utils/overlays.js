// utils/overlays.js
import fs from "fs";
import * as turf from "@turf/turf";

// Load the overlays.geojson file
const overlayData = JSON.parse(
  fs.readFileSync("./utils/overlays.geojson", "utf8")
);
console.log(
  `✅ Loaded overlays.geojson with ${overlayData.features.length} features.`
);

/**
 * Returns overlay polygons that intersect (or contain) a given coordinate.
 * Uses a 10m buffer around the point to capture partial parcel overlaps.
 */
export function getOverlays(x, y) {
  const xNum = Number(x);
  const yNum = Number(y);

  // Validate coordinates
  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getOverlays:", {
      x,
      y,
    });
    return [];
  }

  // Create Turf.js geometries
  const point = turf.point([xNum, yNum]);
  const buffered = turf.buffer(point, 10, { units: "meters" }); // 10m radius “parcel”

  // Find overlays that intersect the buffered area
  const matches = overlayData.features.filter((feature) =>
    turf.booleanIntersects(buffered, feature)
  );

  if (matches.length === 0) {
    console.log("ℹ️ No overlay matches found for these coordinates.");
  } else {
    console.log(
      `🏛️ ${matches.length} overlay match(es) found near (${xNum}, ${yNum})`
    );
  }

  // Format the overlay results
  return matches.map((f) => ({
    district: f.properties?.DistrictName || null,
    fullDistrict: f.properties?.FullDistrictName || null,
    subDistrict: f.properties?.SubDistrictName || null,
    municipality: f.properties?.Municipality || null,
    swis: f.properties?.Swis || null,
  }));
}