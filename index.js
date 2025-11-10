// index.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

// Health check route
app.get("/", (req, res) => {
  res.send("✅ Amenia Scraper API is live and ready!");
});

// Working /scrape route
app.get("/scrape", (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  res.json({
    address,
    message: "✅ /scrape endpoint is working properly on Render!"
  });
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on port ${PORT}`);
});