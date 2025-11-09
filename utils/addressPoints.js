// utils/addressPoints.js
import fs from "fs";
import path from "path";
import JSONStream from "JSONStream";

const addrPath = path.resolve("./utils/addressPoints.geojson");

export async function findAddressCoords(searchAddress) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(addrPath, { encoding: "utf8" });
    const parser = JSONStream.parse("features.*");

    let found = null;
    stream.pipe(parser);

    parser.on("data", feature => {
      const fullAddr = feature.properties.FULLADDRESS?.toUpperCase() || "";
      if (fullAddr.includes(searchAddress.toUpperCase())) {
        found = {
          x: feature.geometry.coordinates[0],
          y: feature.geometry.coordinates[1],
          fullAddress: feature.properties.FULLADDRESS,
          municipality: feature.properties.MUNICIPALITY
        };
        stream.destroy(); // stop reading once found
      }
    });

    parser.on("end", () => resolve(found));
    parser.on("error", reject);
  });
}