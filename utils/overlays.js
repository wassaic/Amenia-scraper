import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";

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

export function getOverlays(x, y) {
  const xNum = Number(x);
  const yNum = Number(y);

  if (Number.isNaN(xNum) || Number.isNaN(yNum)) {
    console.error("❌ Invalid overlay coordinates:", { x, y });
    return [];
  }

  const point = turf.point([xNum, yNum]);
  const buffer = turf.buffer(point, 0.015, { units: "kilometers" }); // ~15m buffer

  const matches = overlayData.features.filter(f =>
    turf.booleanIntersects(buffer, f)
  );

  if (!matches.length) {
    console.warn("⚠️ No overlay match found for coordinates:", { xNum, yNum });
  }

  return matches.map(f => ({
    district: f.properties?.DistrictName || null,
    fullDistrict: f.properties?.FullDistrictName || null,
    subDistrict: f.properties?.SubDistrictName || null,
    municipality: f.properties?.Municipality || null,
    swis: f.properties?.Swis || null,
  }));
}