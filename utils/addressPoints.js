import fs from "fs";
import path from "path";

const addrPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "addressPoints.geojson"
);

const clean = (value = "") =>
  value.toLowerCase().replace(/[\.,]/g, "").replace(/\s+/g, " ").trim();

let addrData = null;
let municipalityIndex = [];

try {
  const raw = fs.readFileSync(addrPath, "utf8");
  addrData = JSON.parse(raw);
  console.log(`✅ Loaded addressPoints.geojson with ${addrData.features.length} address points.`);

  const seen = new Set();
  addrData.features.forEach((feature) => {
    const municipality = clean(feature?.properties?.MUNICIPALITY || "");
    if (!municipality || seen.has(municipality)) return;
    seen.add(municipality);
  });

  municipalityIndex = Array.from(seen).sort((a, b) => b.length - a.length);
} catch (err) {
  console.error("❌ Failed to load addressPoints.geojson:", err.message);
}

const detectMunicipality = (normalizedAddress) => {
  return municipalityIndex.find((municipality) => normalizedAddress.includes(municipality)) || null;
};

const normalizeFeature = (feature) => {
  const fullAddress = clean(feature?.properties?.FULLADDRESS || "");
  const municipality = clean(feature?.properties?.MUNICIPALITY || "");
  const number = feature?.properties?.NUM ?? null;
  return { fullAddress, municipality, number };
};

const extractNumber = (value = "") => {
  const match = value.match(/^(\d{1,6})/);
  return match ? Number(match[1]) : null;
};

/**
 * Finds coordinates for a given address (case-insensitive fuzzy match)
 * Prefers matches whose municipality is explicitly referenced in the query.
 */
export function findAddressCoords(address) {
  if (!addrData || !address) return null;

  const normalizedAddress = clean(address);
  const numberHint = extractNumber(normalizedAddress);
  const municipalityHint = detectMunicipality(normalizedAddress);

  const candidates = addrData.features
    .map((feature) => {
      const { fullAddress, municipality, number } = normalizeFeature(feature);
      if (!fullAddress) return null;

      const matchesAddress =
        normalizedAddress.startsWith(fullAddress) ||
        fullAddress.startsWith(normalizedAddress) ||
        normalizedAddress.includes(fullAddress);

      if (!matchesAddress) return null;

      const numberMatches =
        numberHint !== null &&
        number !== null &&
        Number(number) === numberHint;

      return { feature, fullAddress, municipality, numberMatches };
    })
    .filter(Boolean);

  if (candidates.length === 0) return null;

  const bestMatch =
    candidates.find(
      (candidate) => candidate.numberMatches && candidate.municipality === municipalityHint
    ) ||
    candidates.find((candidate) => candidate.numberMatches) ||
    (municipalityHint &&
      candidates.find((candidate) => candidate.municipality === municipalityHint)) ||
    candidates
      .slice()
      .sort((a, b) => b.fullAddress.length - a.fullAddress.length)[0];
  const [x, y] = bestMatch.feature.geometry.coordinates.map(Number);

  return {
    x,
    y,
    fullAddress: bestMatch.feature.properties.FULLADDRESS,
    municipality: bestMatch.feature.properties.MUNICIPALITY,
  };
}
