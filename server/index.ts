import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { connectDB, closeDB } from "./db.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import {
  authRoutes,
  userRoutes,
  eventRoutes,
  venueRoutes,
  sessionRoutes,
  speakerRoutes,
  sponsorRoutes,
  ticketRoutes,
  attendeeRoutes,
  packageRoutes,
  announcementRoutes,
  aiRoutes,
  checkinRoutes,
} from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Connect to MongoDB
  await connectDB();

  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ─── API Routes ─────────────────────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/venues", venueRoutes);
  app.use("/api/sessions", sessionRoutes);
  app.use("/api/speakers", speakerRoutes);
  app.use("/api/sponsors", sponsorRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/attendees", attendeeRoutes);
  app.use("/api/packages", packageRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/checkin", checkinRoutes);

  // ─── Error handling ──────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ─── Static file serving (production) ───────────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`🚀 EventForge API server running on http://localhost:${port}/`);
    console.log(`📡 API base: http://localhost:${port}/api`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
