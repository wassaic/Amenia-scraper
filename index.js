// index.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

// Root route
app.get("/", (req, res) => {
  res.send("✅ Amenia Scraper API is live!");
});

// Scrape route
app.get("/scrape", (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  res.json({
    address,
    message: "✅ The /scrape endpoint works and is responding properly!"
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});