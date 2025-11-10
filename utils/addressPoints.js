import fs from "fs";

const addrData = JSON.parse(fs.readFileSync("./utils/addressPoints.geojson", "utf8"));
console.log(`✅ Loaded addressPoints.geojson with ${addrData.features.length} address points.`);

export function findAddressCoords(address) {
  const clean = address.toUpperCase().replace(/\s+/g, " ").trim();
  const match = addrData.features.find((f) => {
    const a = f.properties.FULLADDRESS?.toUpperCase().trim();
    return a && clean.includes(a);
  });

  if (!match) return null;

  const [x, y] = match.geometry.coordinates;
  return {
    x,
    y,
    fullAddress: match.properties.FULLADDRESS,
    municipality: match.properties.MUNICIPALITY,
  };
}