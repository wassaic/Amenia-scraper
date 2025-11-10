// utils/addressPoints.js
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const addrPath = path.join(__dirname, "addressPoints.geojson");

let addrData = null;
try {
  if (fs.existsSync(addrPath)) {
    const raw = fs.readFileSync(addrPath, "utf8");
    addrData = JSON.parse(raw);
    console.log(`✅ Loaded addressPoints.geojson with ${addrData.features.length} address points.`);
  } else {
    console.error(`❌ addressPoints.geojson not found at ${addrPath}`);
  }
} catch (err) {
  console.error("❌ Failed to load addressPoints.geojson:", err.message);
}

export function findAddressCoords(address) {
  if (!addrData) return null;

  const normalized = address.toLowerCase().replace(/[\.,]/g, "");
  const match = addrData.features.find(f =>
    f.properties?.FULLADDRESS &&
    normalized.includes(f.properties.FULLADDRESS.toLowerCase().replace(/[\.,]/g, ""))
  );

  if (!match) {
    console.warn(`⚠️ No address match found for: ${address}`);
    return null;
  }

  const coords = match.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    console.warn(`⚠️ Invalid geometry for: ${match.properties.FULLADDRESS}`);
    return null;
  }

  const [x, y] = coords.map(Number);
  if (isNaN(x) || isNaN(y)) {
    console.warn(`⚠️ Non-numeric coordinates for: ${match.properties.FULLADDRESS}`);
    return null;
  }

  return {
    x,
    y,
    fullAddress: match.properties.FULLADDRESS,
    municipality: match.properties.MUNICIPALITY,
  };
}