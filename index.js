// index.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

// Root route – confirms service is live
app.get("/", (req, res) => {
  res.send("✅ Amenia Scraper API is live on Render!");
});

// Scrape route – this is what GPT or cURL will call
app.get("/scrape", async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: "Missing ?address parameter" });
  }

  // TEMPORARY placeholder response
  // (You can later plug in real zoning + overlay logic)
  res.json({
    success: true,
    address,
    message: "✅ /scrape route is responding correctly on Render!"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});