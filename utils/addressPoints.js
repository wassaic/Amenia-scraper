// utils/addressPoints.js
import fs from "fs";
import path from "path";

// ✅ Build absolute path to the local GeoJSON
const addrPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "addressPoints.geojson"
);

let addrData = null;
try {
  const raw = fs.readFileSync(addrPath, "utf8");
  addrData = JSON.parse(raw);
  console.log(`✅ Loaded addressPoints.geojson with ${addrData.features.length} address points.`);
} catch (err) {
  console.error("❌ Failed to load addressPoints.geojson:", err.message);
}

/**
 * Finds coordinates for a given address (case-insensitive fuzzy match)
 */
export function findAddressCoords(address) {
  if (!addrData) return null;

  const normalized = address.toLowerCase().replace(/[\.,]/g, "");
  const match = addrData.features.find(f =>
    f.properties &&
    f.properties.FULLADDRESS &&
    normalized.includes(
      f.properties.FULLADDRESS.toLowerCase().replace(/[\.,]/g, "")
    )
  );

  if (!match) return null;

  const [x, y] = match.geometry.coordinates.map(Number);
  return {
    x,
    y,
    fullAddress: match.properties.FULLADDRESS,
    municipality: match.properties.MUNICIPALITY,
  };
}