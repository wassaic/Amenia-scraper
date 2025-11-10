// utils/addressPoints.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const addrPath = path.resolve(__dirname, "addressPoints.geojson");

let addrData = null;
try {
  const raw = fs.readFileSync(addrPath, "utf8");
  addrData = JSON.parse(raw);
  console.log(`✅ Loaded addressPoints.geojson with ${addrData.features.length} address points.`);
} catch (err) {
  console.error("❌ Failed to load addressPoints.geojson:", err.message);
}

/**
 * Finds coordinates for a given address (case-insensitive)
 */
export function findAddressCoords(address) {
  if (!addrData) return null;

  const normalized = address.toLowerCase().replace(/[\.,]/g, "");
  const match = addrData.features.find(
    (f) =>
      f.properties &&
      f.properties.FULLADDRESS &&
      normalized.includes(
        f.properties.FULLADDRESS.toLowerCase().replace(/[\.,]/g, "")
      )
  );

  if (!match || !match.geometry || !Array.isArray(match.geometry.coordinates)) {
    console.warn(`⚠️ No coordinate match for ${address}`);
    return null;
  }

  const [xRaw, yRaw] = match.geometry.coordinates;
  const x = parseFloat(xRaw);
  const y = parseFloat(yRaw);

  if (isNaN(x) || isNaN(y)) {
    console.warn(`⚠️ Invalid coordinate data for ${address}:`, match.geometry.coordinates);
    return null;
  }

  return {
    x,
    y,
    fullAddress: match.properties.FULLADDRESS,
    municipality: match.properties.MUNICIPALITY,
  };
}