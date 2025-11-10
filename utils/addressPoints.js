// utils/addressPoints.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Correctly resolve path to addressPoints.geojson regardless of runtime directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const addrPath = path.join(__dirname, "addressPoints.geojson");

let addrData = null;
try {
  const raw = fs.readFileSync(addrPath, "utf8");
  addrData = JSON.parse(raw);
  console.log(`✅ Loaded addressPoints.geojson with ${addrData.features.length} address points.`);
} catch (err) {
  console.error("❌ Failed to load addressPoints.geojson:", err.message);
}

/**
 * Finds coordinates for a given address (case-insensitive + punctuation-tolerant)
 */
export function findAddressCoords(address) {
  if (!addrData) return null;

  // Normalize for more flexible matching
  const normalized = address.toLowerCase()
    .replace(/[\.,]/g, "")
    .replace(/\b(street|st)\b/g, "st")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\s+/g, " ")
    .trim();

  const match = addrData.features.find(f => {
    const full = f.properties?.FULLADDRESS?.toLowerCase()
      .replace(/[\.,]/g, "")
      .replace(/\b(street|st)\b/g, "st")
      .replace(/\b(road|rd)\b/g, "rd")
      .replace(/\b(avenue|ave)\b/g, "ave")
      .replace(/\s+/g, " ")
      .trim();

    return full && (normalized.includes(full) || full.includes(normalized));
  });

  if (!match) return null;

  const [x, y] = match.geometry.coordinates;
  return {
    x,
    y,
    fullAddress: match.properties.FULLADDRESS,
    municipality: match.properties.MUNICIPALITY
  };
}