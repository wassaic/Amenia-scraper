import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

// ✅ Build absolute path
const overlayPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "overlays.geojson"
);

let overlayData = null;

try {
  const raw = fs.readFileSync(overlayPath, "utf8");
  overlayData = JSON.parse(raw);
  console.log(`✅ Loaded overlays.geojson with ${overlayData.features.length} features.`);
} catch (err) {
  console.error("❌ Failed to load overlays.geojson:", err.message);
}

/**
 * Lookup overlay districts for given coordinates.
 * Detects full or partial inclusion within overlay polygons.
 */
export function getOverlays(x, y) {
  if (!overlayData) {
    console.error("⚠️ Overlay data not loaded.");
    return [];
  }

  const xNum = Number(x);
  const yNum = Number(y);
  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid coordinate numbers passed to getOverlays:", { x, y });
    return [];
  }

  const point = turf.point([xNum, yNum]);
  const bufferedPoint = turf.buffer(point, 20, { units: "meters" }); // small buffer for partial touch detection

  const matches = overlayData.features
    .map((f) => {
      try {
        const fullInside = turf.booleanPointInPolygon(point, f.geometry);
        const touches = turf.booleanIntersects(bufferedPoint, f.geometry);
        if (fullInside || touches) {
          const props = f.properties || {};
          return {
            district: props.DistrictName || null,
            fullDistrict: props.FullDistrictName || null,
            subDistrict: props.SubDistrictName || null,
            municipality: props.Municipality || null,
            swis: props.Swis || null,
            partial: !fullInside && touches, // flag partial intersections
          };
        }
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return matches;
}