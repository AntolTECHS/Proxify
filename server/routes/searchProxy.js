import express from "express";

const router = express.Router();

router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Missing search query" });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          "User-Agent": "ServLinkApp/1.0",
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Search proxy error:", error);
    res.status(500).json({ error: "Failed to fetch location data" });
  }
});

export default router;