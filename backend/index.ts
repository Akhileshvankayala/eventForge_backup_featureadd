import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { connectDB, closeDB } from "./db.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { refreshKnowledgePdf } from "./lib/knowledgePdf.js";
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
  publicRoutes,
  analyticsRoutes,
} from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Fail fast in production on the dev JWT secret — tokens must be signed
  // with a real secret (set JWT_SECRET env var).
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production");
  }

  // Connect to MongoDB
  await connectDB();

  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off: SPA uses inline runtime scripts
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // Brute-force guard on auth endpoints.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again later" },
  });
  app.use("/api/auth/", authLimiter);

  // SEO/discoverability for the SPA shell.
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nAllow: /\nAllow: /api/public/\nDisallow: /api/\n");
  });
  app.get("/sitemap.xml", (_req, res) => {
    const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
        ["", "auth", "attendee"].map((p) => `<url><loc>${base}/${p}</loc></url>`).join("") +
        `</urlset>`
    );
  });

  // ─── API Routes ─────────────────────────────────────────────────────────────
  // After any successful data mutation, refresh the knowledge PDF in the
  // background so the copilot's knowledge base tracks live data.
  const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);
  const SKIP_REFRESH = ["/api/ai/knowledge/refresh", "/api/auth/"];
  app.use("/api", (req, res, next) => {
    res.on("finish", () => {
      if (!MUTATING.has(req.method) || res.statusCode >= 400) return;
      if (SKIP_REFRESH.some((p) => req.path.startsWith(p.replace("/api", "")) || ("/api" + req.path).startsWith(p))) return;
      refreshKnowledgePdf().catch((err) => console.error("Knowledge PDF refresh failed:", err));
    });
    next();
  });
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
  app.use("/api/public", publicRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // ─── Static file serving + SPA fallback (before 404 handler) ──────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // ─── Error handling (last) ───────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

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

// Never let a single bad request kill the process (Express 4 has no async guard).
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (server kept alive):", err);
});
