import { Router } from "express";
import { body } from "express-validator";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { answer } from "../lib/rag.js";
import { refreshKnowledgePdf } from "../lib/knowledgePdf.js";

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

// ─── Chatbot: free-form draft generation (used by ChatbotPanel) ───────────────
// Public: mock AI carries no sensitive data, and the panel calls it untokened.
router.post("/generate", body("prompt").trim().notEmpty(), validate, (req: AuthRequest, res) => {
  const { prompt, context } = req.body as { prompt: string; context?: string };
  const lower = prompt.toLowerCase();
  let text: string;
  if (lower.includes("bio") || lower.includes("speaker")) {
    text = `Speaker bio draft:\n\n"Alex Morgan is a product and technology leader with a decade of experience turning ambitious ideas into shipped products. They have led teams through hyper-growth, platform migrations, and AI adoption — always with a focus on the humans using the tools. Alex writes and speaks about responsible innovation, resilient teams, and the craft of building."\n\nWant it shorter, more formal, or tuned to a specific audience?`;
  } else if (lower.includes("announcement") || lower.includes("email") || lower.includes("invite")) {
    text = `Announcement draft:\n\nSubject: You're invited — save your seat\n\nHi there,\n\nSomething good is coming: sharp sessions, honest conversations, and a room full of people building what's next. Early-bird pricing ends soon — grab your seat before the room fills.\n\nSee you there,\nThe EventForge team`;
  } else if (lower.includes("summary") || lower.includes("session")) {
    text = `Session summary draft:\n\nA practical, hands-on session: real examples, takeaways you can apply Monday morning, and time for your hardest questions. Best for practitioners who want depth over hype.\n\nWant it shorter, more action-oriented, or tailored to a level?`;
  } else {
    text = `Here's a draft event description:\n\n"A gathering for leaders shaping the next chapter of work. Across keynotes, workshops, and honest panels, you'll join sharp conversations and leave with momentum — plus a room full of people building what comes next."\n\nTell me the audience, tone, or length and I'll sharpen it.`;
  }
  if (context) text += `\n\n(Built on our earlier thread for continuity.)`;
  res.json({ text, model: "mock-ai-v1" });
});

// ─── Chatbot: session recommendations (used by ChatbotPanel) ─────────────────
router.post(
  "/recommend",
  body("prompt").trim().notEmpty(),
  body("sessions").optional().isArray(),
  validate,
  (req: AuthRequest, res) => {
    const { prompt, sessions = [] } = req.body as {
      prompt: string;
      sessions?: Array<{ title: string; tag?: string }>;
    };
    const lower = prompt.toLowerCase();
    let picks = sessions.slice(0, 5);
    if (lower.includes("beginner") || lower.includes("first-time")) {
      picks = sessions.filter((s) => /keynote|panel|intro/i.test(`${s.title} ${s.tag ?? ""}`)).slice(0, 4);
      if (!picks.length) picks = sessions.slice(0, 4);
    } else if (lower.includes("advanced") || lower.includes("technical") || lower.includes("deep")) {
      picks = sessions.filter((s) => /workshop|advanced|systems/i.test(`${s.title} ${s.tag ?? ""}`)).slice(0, 3);
      if (!picks.length) picks = sessions.slice(0, 3);
    }
    if (!picks.length) {
      return res.json({
        text: "I don't have a session catalog to work from yet. Once your event has sessions loaded, I can match them to your interests.\n\nIn the meantime: start with one keynote, pick one deep-dive per topic you care about, and leave one slot open for serendipity.",
        model: "mock-ai-v1",
      });
    }
    const list = picks.map((s, i) => `${i + 1}. ${s.title}${s.tag ? ` — ${s.tag}` : ""}`).join("\n");
    res.json({
      text: `Based on "${prompt.slice(0, 80)}", here are my picks:\n\n${list}\n\nWant these narrowed by role, time conflicts, or theme?`,
      model: "mock-ai-v1",
    });
  }
);

// ─── Copilot Q&A over the knowledge base (guide + live user-scoped data) ─────
router.post(
  "/ask",
  authMiddleware,
  body("question").trim().notEmpty().isLength({ max: 1000 }),
  body("history").optional().isArray({ max: 12 }),
  validate,
  async (req: AuthRequest, res) => {
    const { question, history = [] } = req.body as {
      question: string;
      history?: Array<{ role: string; text: string }>;
    };
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string")
      .slice(-8)
      .map((h) => ({ role: h.role as "user" | "assistant", text: h.text.slice(0, 500) }));
    const result = await answer(question, {
      id: req.user!.id,
      role: req.user!.role,
      name: req.user!.name,
      email: req.user!.email,
    }, cleanHistory);
    res.json({ ...result, model: "rag-v2" });
  }
);

// ─── Regenerate the knowledge PDF (includes live counts appendix) ────────────
router.post("/knowledge/refresh", requireRole("admin", "organizer"), async (_req, res) => {
  try {
    const { generatedAt } = await refreshKnowledgePdf();
    res.json({ ok: true, generatedAt });
  } catch (err) {
    res.status(500).json({ error: "PDF refresh failed" });
  }
});

export default router;
