import fs from "fs";

const CACHE_FILE = "cache.json";

export function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
    return {};
  } catch (err) {
    console.error("⚠️ Failed to load cache:", err);
    return {};
  }
}

export function saveCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    console.log("💾 Cache saved.");
  } catch (err) {
    console.error("⚠️ Failed to save cache:", err);
  }
}