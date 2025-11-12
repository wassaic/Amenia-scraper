# Amenia Scraper - AI Agent Instructions

## Project Overview

**Amenia Scraper** is a Node.js Express server that scrapes Dutchess County GIS address data and enriches it with local zoning and overlay district information. It combines **Puppeteer web scraping** with **local GeoJSON spatial queries**.

### Architecture Pattern

The project follows a **data-augmentation pipeline**:
1. **Web scraper** (Puppeteer): Extracts parcel grid, school district, road authority from Dutchess GIS
2. **Coordinate lookup** (`addressPoints.js`): Fuzzy-matches addresses to local GeoJSON coordinates
3. **Spatial queries** (`zoning.js`, `overlays.js`): Uses Turf.js to find point-in-polygon relationships
4. **Express endpoint** (`index.js`): Orchestrates all three steps, returns unified JSON

## Key Files & Their Responsibilities

- **`index.js`**: Main entry point. Express `/scrape` endpoint that orchestrates the full pipeline
- **`utils/addressPoints.js`**: Loads 107k+ address points from `addressPoints.geojson`, provides `findAddressCoords()` for fuzzy address matching
- **`utils/zoning.js`**: Point-in-polygon lookup for zoning codes using Turf.js `booleanPointInPolygon()`
- **`utils/overlays.js`**: Overlay district detection with buffered point matching (20m buffer for partial touches)
- **`utils/cache.js`**: In-memory LRU cache (30-min TTL) for repeated queries
- **GeoJSON data**: `zoning.geojson` (360 features), `overlays.geojson` (75 features), `addressPoints.geojson` (107k points)

## Critical Patterns & Conventions

### Coordinate System
- **All coordinates are `[longitude, latitude]`** (standard GeoJSON order)
- Exposed to API as `coordinates: { x (lon), y (lat) }`
- Turf.js operations expect `turf.point([lon, lat])`

### Error Handling
- Each GeoJSON loader has try/catch with console logging at startup
- Graceful fallback: `if (!zoningData) return { code: null, ... }`
- Browser/page cleanup always runs in `finally` block

### Puppeteer Stealth & Environment
- **Stealth mode required** for Dutchess GIS (set with `puppeteer-extra-plugin-stealth`)
- **Chromium path detection**: Falls back from `PUPPETEER_EXECUTABLE_PATH` env var → production path `/usr/bin/google-chrome-stable` → local executablePath
- **Timeouts are generous** (15-40s) due to slow GIS interface
- **Render.yaml deployment**: App runs on port 10000 by default

### Address Matching
- **Fuzzy matching** in `addressPoints.js`: normalizes case and strips punctuation
- **"Includes" substring match**: Handles partial addresses (e.g., "Main St" matches "10 Main St")
- Returns `null` if no match found (caller must handle gracefully)

### Spatial Queries with Turf.js
- `turf.booleanPointInPolygon(point, polygon)`: Exact containment
- `turf.buffer(point, 20, { units: "meters" })`: Small buffer for detecting district boundaries
- Both `zoning` and `overlays` validate coordinate numbers before querying

## Development Workflows

### Local Testing
```bash
npm install
npm run dev  # Runs with NODE_ENV=development
# Then: curl "http://localhost:10000/scrape?address=10%20Main%20St%20Amenia%20NY"
```

### Adding a New Data Layer
1. Add GeoJSON file to `utils/` directory
2. Create new `utils/newFeature.js` following the pattern:
   - Load GeoJSON at module load time with try/catch
   - Export lookup function `export function getNewFeature(x, y)`
   - Use Turf.js for spatial operations
3. Import in `index.js` and call from `/scrape` endpoint
4. Add startup console message confirming load count

### Environment Variables
- `PORT`: Server port (default 10000)
- `NODE_ENV`: Set to "development" for local debugging
- `PUPPETEER_EXECUTABLE_PATH`: Override Chrome/Chromium binary path

## Common Pitfalls & Gotchas

- **Coordinate swap**: Using `[lat, lon]` instead of `[lon, lat]` breaks all Turf queries
- **NaN coordinates**: Validate with `!isNaN(x) && !isNaN(y)` before Turf calls
- **Async timing**: Use generous delays (`await delay(800)`) for GIS form interactions
- **Browser not closed**: Always ensure Puppeteer browser cleanup in `finally`
- **Missing GeoJSON**: Application starts successfully but returns null data if files missing

## Response Format

All successful requests return:
```json
{
  "address": "input address",
  "source": "Dutchess County GIS Address Info Finder + Local Zoning + Overlay Districts",
  "scrapedAt": "ISO timestamp",
  "data": {
    "parcelGrid": "...",
    "schoolDistrict": "...",
    "coordinates": { "x": lon, "y": lat, "municipality": "...", "fullAddress": "..." },
    "zoning": { "code": "...", "description": "...", "municipality": "..." },
    "overlays": [{ "district": "...", "fullDistrict": "...", "municipality": "..." }]
  }
}
```

## Node.js & Deployment Notes

- **Node 20.x** required (specified in `package.json` engines)
- **ES modules** (`import`/`export`): Requires `"type": "module"` in package.json
- **Absolute path resolution**: All GeoJSON paths use `path.resolve()` with `new URL(import.meta.url)` for cross-platform compatibility
- **Render.yaml**: Production deployment on Render platform
