import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for file handling if needed (though we aim for client-side)
  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock API for encryption (as requested, though client-side is better)
  app.post("/api/encrypt", (req, res) => {
    // In a real scenario, this would handle server-side encryption
    // For this demo, we prioritize client-side for security as stated in requirements
    res.status(501).json({ error: "Server-side encryption not implemented. Using client-side Web Crypto API for maximum security." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ThenaCrypt Server running on http://localhost:${PORT}`);
  });
}

startServer();
