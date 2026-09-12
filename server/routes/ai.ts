import { Router } from "express";
import { body } from "express-validator";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

// Mock AI endpoints that return generated draft text.
// In production these would call an LLM API; here we return plausible drafts.

const router = Router();

// ─── Generate event description ──────────────────────────────────────────────
router.post(
  "/generate-event-description",
  authMiddleware,
  body("title").trim().notEmpty(),
  body("type").optional().notEmpty(),
  body("audience").optional().trim(),
  body("tone").optional().trim().isIn(["professional", "casual", "enthusiastic", "formal"]),
  validate,
  (req: AuthRequest, res) => {
    const { title, type, audience, tone } = req.body;
    const tones: Record<string, string[]> = {
      professional: ["We are pleased to announce", "An exceptional gathering of", "A premier event dedicated to"],
      casual: ["Hey everyone!", "Get ready for", "Something awesome is coming"],
      enthusiastic: ["You won't want to miss", "An incredible experience awaits", "Get excited for"],
      formal: ["We cordially invite you to", "The distinguished gathering of", "A formal assembly for"],
    };

    const toneList = tones[tone || "professional"] || tones.professional;
    const intros = toneList;
    const intro = intros[Math.floor(Math.random() * intros.length)];

    const typeDesc = type ? ` focused on ${type}` : "";
    const audienceDesc = audience ? `, designed for ${audience}` : "";

    const body = `Experience ${title}${typeDesc}${audienceDesc} — a dynamic event bringing together industry leaders, practitioners, and enthusiasts to share insights, explore emerging trends, and forge lasting connections. With curated sessions, expert speakers, and networking opportunities, this is the definitive event for anyone passionate about the field.`;

    const draft = `${intro} ${title}.${body}\n\nDon't miss this opportunity to be part of an unforgettable experience. Register today and secure your spot.`;

    res.json({ draft, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
  }
);

// ─── Generate session description ─────────────────────────────────────────────
router.post(
  "/generate-session-description",
  authMiddleware,
  body("title").trim().notEmpty(),
  body("type").optional().notEmpty(),
  body("level").optional().isIn(["beginner", "intermediate", "advanced"]),
  body("keyPoints").optional().isArray(),
  validate,
  (req: AuthRequest, res) => {
    const { title, type, level, keyPoints } = req.body;
    const levelDesc = level ? ` This session is pitched at a ${level} level.` : "";
    const typeDesc = type ? ` A deep dive into ${type}.` : "";
    const pointsText = keyPoints && keyPoints.length > 0
      ? "\n\nKey takeaways:\n" + keyPoints.map((p: string) => `- ${p}`).join("\n")
      : "";

    const draft = `**${title}**${typeDesc}${levelDesc}\n\nThis session explores the latest developments and practical approaches around ${title.toLowerCase()}. Participants will gain actionable insights they can apply immediately in their work.\n\nWhether you're new to the topic or looking to deepen your expertise, this session offers valuable perspectives and real-world examples.${pointsText}\n\nCome prepared to engage, ask questions, and leave with new ideas to implement.`;

    res.json({ draft, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
  }
);

// ─── Generate speaker bio ─────────────────────────────────────────────────────
router.post(
  "/generate-speaker-bio",
  authMiddleware,
  body("name").trim().notEmpty(),
  body(" expertise").optional().trim(),
  body("achievements").optional().isArray(),
  body("tone").optional().trim().isIn(["formal", "conversational", "brief"]),
  validate,
  (req: AuthRequest, res) => {
    const { name, expertise, achievements, tone } = req.body;
    const expertiseStr = expertise || "technology and innovation";
    const achievmentsStr = achievements && achievements.length > 0
      ? " " + achievements.map((a: string) => `Recognized for ${a}.`).join(" ")
      : "";

    if (tone === "brief") {
      const draft = `${name} is a ${expertiseStr} professional with a track record of delivering impactful work${achievmentsStr}.`;
      return res.json({ draft, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
    }

    if (tone === "formal") {
      const draft = `${name} brings extensive expertise in ${expertiseStr}, building on a career marked by${achievmentsStr} Thought leadership, strategic vision, and a commitment to excellence define their approach to every engagement.`;
      return res.json({ draft, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
    }

    const draft = `${name} is passionate about ${expertiseStr}${achievmentsStr}. They bring energy, insight, and practical experience to every conversation, and they're excited to share what they've learned with this community.`;
    res.json({ draft, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
  }
);

// ─── Generate email announcement ──────────────────────────────────────────────
router.post(
  "/generate-email",
  authMiddleware,
  body("subject").trim().notEmpty(),
  body("audience").optional().trim(),
  body("keyPoints").optional().isArray(),
  body("cta").optional().trim(),
  validate,
  (req: AuthRequest, res) => {
    const { subject, audience, keyPoints, cta } = req.body;
    const audienceLine = audience ? `Dear ${audience},` : "Hello,";
    const pointsText = keyPoints && keyPoints.length > 0
      ? "\n\n" + keyPoints.map((p: string) => `• ${p}`).join("\n")
      : "";
    const ctaLine = cta ? `\n\n${cta}` : "";

    const draft = `${audienceLine}\n\nWe're excited to share some important updates with you.${pointsText}${ctaLine}\n\nThank you for being part of our community.\n\nBest regards,\nThe Event Team`;

    res.json({ draft, subject, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
  }
);

// ─── Generate social media post ───────────────────────────────────────────────
router.post(
  "/generate-social-post",
  authMiddleware,
  body("eventName").trim().notEmpty(),
  body("platform").optional().isIn(["twitter", "linkedin", "facebook", "instagram"]),
  body("highlights").optional().isArray(),
  body("cta").optional().trim(),
  validate,
  (req: AuthRequest, res) => {
    const { eventName, platform, highlights, cta } = req.body;
    const maxLen = platform === "twitter" ? 280 : 1000;
    let post = platform === "twitter"
      ? `🚀 ${eventName} is happening! `
      : `We're thrilled to announce that ${eventName} is coming up!`;

    if (highlights && highlights.length > 0) {
      const h = highlights.slice(0, platform === "twitter" ? 2 : 4);
      post += h.map((x: string) => ` ${x}`).join(" ");
    }

    if (cta) post += ` ${cta}`;
    if (platform === "twitter" && post.length > maxLen) post = post.slice(0, maxLen - 3) + "...";

    post += "\n\n#EventForge";

    res.json({ draft: post, platform, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
  }
);

// ─── Generate event agenda outline ────────────────────────────────────────────
router.post(
  "/generate-agenda",
  authMiddleware,
  body("eventName").trim().notEmpty(),
  body("durationDays").isInt({ min: 1, max: 7 }),
  body("sessionCount").optional().isInt({ min: 1 }),
  body("themes").optional().isArray(),
  validate,
  (req: AuthRequest, res) => {
    const { eventName, durationDays, sessionCount = 6, themes = ["Keynote", "Workshop", "Panel", "Networking"] } = req.body;
    const agenda: any[] = [];
    const timeSlots = ["09:00 - 10:00", "10:30 - 11:30", "12:00 - 13:00", "14:00 - 15:00", "15:30 - 16:30", "17:00 - 18:00"];

    for (let day = 1; day <= durationDays; day++) {
      const daySessions = Math.ceil(sessionCount / durationDays);
      for (let i = 0; i < daySessions && i < timeSlots.length; i++) {
        const theme = themes[i % themes.length];
        agenda.push({
          day,
          time: timeSlots[i],
          type: theme,
          title: `${theme}: Exploring ${eventName} — Day ${day}`,
          speaker: null,
          room: null,
        });
      }
    }

    res.json({ agenda, prompt: JSON.stringify(req.body), model: "mock-ai-v1" });
  }
);

export default router;
