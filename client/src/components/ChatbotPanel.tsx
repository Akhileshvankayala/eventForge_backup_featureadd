import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, SendHorizontal, Loader2, X, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { usePersistFn } from "@/hooks/usePersistFn";

type MessageRole = "user" | "assistant" | "system";
type Message = { role: MessageRole; text: string; timestamp?: number };
type QuickAction = { label: string; prompt: string; variant?: "default" | "outline" };

const GENERATE_QUICK_ACTIONS: QuickAction[] = [
  { label: "Draft event description", prompt: "Write a compelling 150-word event description for an innovation summit targeting senior product leaders. Include tone, audience, and value proposition.", variant: "outline" },
  { label: "Write speaker bio", prompt: "Draft a 120-word speaker bio for a CTO speaking about responsible AI adoption in enterprise. Professional tone, highlight recent achievements.", variant: "outline" },
  { label: "Create announcement", prompt: "Write an engaging email announcement inviting attendees to register for a three-day product leadership summit in NYC, September 2026.", variant: "outline" },
  { label: "Summarize session", prompt: "Create a concise session summary for a 45-minute workshop on building design systems at scale. Include key takeaways and who should attend.", variant: "outline" },
];

const RECOMMEND_QUICK_ACTIONS: QuickAction[] = [
  { label: "Recommend based on interests", prompt: "Recommend 5 sessions for someone interested in AI, leadership, and product strategy.", variant: "outline" },
  { label: "Beginner-friendly picks", prompt: "Suggest 4 accessible, beginner-friendly sessions for first-time conference attendees.", variant: "outline" },
  { label: "Deep-dive technical", prompt: "Recommend 3 advanced technical sessions for experienced engineers.", variant: "outline" },
];

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || "/api/ai";

interface ChatbotPanelProps {
  eventTitle?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  attendeeMode?: boolean;
  sessions?: Array<{ title: string; tag?: string }>;
}

function buildGeneratePayload(prompt: string, lastMessages: Message[]): Record<string, unknown> {
  const assistantContext = lastMessages
    .filter((m) => m.role === "assistant")
    .slice(-3)
    .map((m) => m.text)
    .join("\n\n");
  return { action: "generate", prompt, context: assistantContext || undefined };
}

function buildRecommendPayload(prompt: string, sessions?: Array<{ title: string; tag?: string }>): Record<string, unknown> {
  return { action: "recommend", prompt, sessions: sessions?.map((s) => ({ title: s.title, tag: s.tag })) };
}

async function callAiEndpoint(url: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { text?: string; response?: string; output?: string; error?: string };
  return data.text || data.response || data.output || (data.error ? `⚠️ ${data.error}` : "Consider refining your prompt for a sharper result.");
}

async function mockGenerate(prompt: string): Promise<string> {
  const lower = prompt.toLowerCase();
  if (lower.includes("description") || lower.includes("event")) {
    return "Here's a draft event description:\n\n\"A two-day gathering for leaders shaping the next chapter of work. Over three tracks — AI in practice, culture as a growth engine, and the human edge of product — you'll join sharp conversations, hands-on workshops, and a room full of people building what comes next. Seats are limited: bring your best questions.\"\n\nFeel free to adjust the tone or length. Want it more formal, more energetic, or tuned to a specific audience?";
  }
  if (lower.includes("bio") || lower.includes("speaker")) {
    return "Speaker bio draft:\n\n\"Priya Nair is Chief Technology Officer at Lumen, where she leads a 90-person engineering org delivering AI-assisted tools for global customer teams. Before Lumen, she scaled infrastructure at two Series-C startups and spent four years at a cloud services company. Priya speaks regularly on responsible AI adoption, reliable systems, and the messy middle of technical leadership. She holds a degree in computer science and an MBA.\"\n\nWant to highlight a different achievement, add a personal detail, or shorten it?";
  }
  if (lower.includes("announcement") || lower.includes("email") || lower.includes("invite")) {
    return "Announcement draft:\n\nSubject: Your seat at the Future of Work Summit is waiting\n\nHi {first_name},\n\nIf 2026 has a theme, it's this: the tools are changing faster than the playbooks. That's why we built the Future of Work Summit — three days of practical sessions, honest conversations, and a room full of people figuring it out alongside you.\n\nWhat's on: responsible AI in production, culture as a growth engine, the human edge of product leadership, plus workshops you can bring back on Monday.\n\nDates: September 18–20, 2026\nLocation: The Glasshouse, NYC\n\nEarly-bird pricing ends August 31 — grab your seat before the room fills.\n\nSee you there,\nThe EventForge team";
  }
  if (lower.includes("summary") || lower.includes("session")) {
    return "Session summary draft:\n\n\"Building design systems at scale — 45 min, Workshop\n\nA practical session for teams moving from a component library in one repo to a system used across products and time zones. We'll cover governance without bureaucracy, versioning that doesn't break consumers, accessibility as a default, and the documentation habits that keep a system alive. Bring a current pain point.\"\n\nWant it shorter, more action-oriented, or tailored to a specific audience level?";
  }
  if (lower.includes("recommend") || lower.includes("session") || lower.includes("interest")) {
    return "Based on what you've shared, here are sessions worth adding to your agenda:\n\n1. Opening keynote: The human edge — the framing session; sets the tone for the whole event.\n2. Building with responsible AI — hands-on, practical, and one of the most-booked sessions.\n3. Culture as a growth engine — a panel that keeps coming up in follow-up conversations.\n4. Shipping design systems without breaking them — workshop; best if you add it early.\n5. Leading through change — fits the leadership track; good pairing with the keynote.\n\nWant these narrowed by your role, time conflicts, or a specific theme?";
  }
  return `Thoughtful starting point for: "${prompt.slice(0, 120)}"\n\nI'd approach this by anchoring on the audience first, then the outcome you want them to walk away with. Want me to refine the tone, trim the length, or focus it on a specific section?`;
}

async function mockRecommend(prompt: string, sessions: Array<{ title: string; tag?: string }>): Promise<string> {
  const tags = sessions.map((s) => s.tag).filter(Boolean) as string[];
  const titles = sessions.map((s) => s.title);
  if (titles.length === 0) {
    return "I don't have a session catalog to work from yet. Once your event has sessions loaded, I can match them to your interests and past registration behavior.\n\nIn the meantime: start with one keynote to frame the event, pick one deep-dive per topic you care about, and leave one slot open for serendipity.";
  }
  const count = Math.min(5, titles.length);
  const picks = titles.slice(0, count).map((t, i) => `${i + 1}. ${t}${tags[i] ? ` — ${tags[i]}` : ""}`).join("\n");
  return `Here are ${count} sessions I'd suggest based on your interests:\n\n${picks}\n\nStarting points — tell me which themes matter most, which times you have free, or which sessions you've already flagged, and I'll re-rank.`;
}

export default function ChatbotPanel({
  eventTitle = "your event",
  open = false,
  onOpenChange,
  attendeeMode = false,
  sessions = [],
}: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: attendeeMode
        ? `Hi — I can recommend sessions based on your interests and what you've registered for. Pick a quick action below or ask me something specific.`
        : `Hi — I can help you draft event descriptions, speaker bios, announcements, and session summaries. Pick a quick action or ask me something specific.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<"generate" | "recommend">("generate");
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, []);

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const send = usePersistFn(
    async (text: string, source: "user-input" | "quick-action" = "user-input") => {
      const trimmed = text.trim();
      if (!trimmed || generating) return;

      const userMessage: Message = { role: "user", text: trimmed, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setGenerating(true);

      const lastMessages = [...messages, userMessage];
      let result: string;
      let usedRealApi = false;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        if (mode === "recommend") {
          try {
            const payload = buildRecommendPayload(trimmed, sessions.length ? sessions : undefined);
            result = await callAiEndpoint(`${AI_BASE_URL}/recommend`, payload, controller.signal);
            usedRealApi = true;
          } catch {
            result = await mockRecommend(trimmed, sessions);
          }
        } else {
          try {
            const payload = buildGeneratePayload(trimmed, lastMessages);
            result = await callAiEndpoint(`${AI_BASE_URL}/generate`, payload, controller.signal);
            usedRealApi = true;
          } catch {
            result = await mockGenerate(trimmed);
          }
        }
      } catch {
        result = `I timed out waiting for a response. Try again in a moment, or here's a quick take: ${mockGenerate(trimmed).slice(0, 220)}…`;
      } finally {
        clearTimeout(timeout);
      }

      setMessages((prev) => [...prev, { role: "assistant", text: result, timestamp: Date.now() }]);
      setGenerating(false);

      if (!usedRealApi) {
        toast.success("AI draft ready", {
          description: "Falling back to on-device draft while the AI service is unavailable.",
          duration: 4000,
        });
      }
    },
  );

  const handleSubmit = usePersistFn((e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  });

  const handleQuickAction = usePersistFn((prompt: string) => {
    send(prompt, "quick-action");
  });

  const typedMessages = messages.filter((m) => m.role !== "system");
  const quickActions = mode === "recommend" || !attendeeMode
    ? GENERATE_QUICK_ACTIONS
    : RECOMMEND_QUICK_ACTIONS;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-5 right-5 z-[70] flex w-[min(92vw,440px)] flex-col overflow-hidden rounded-[22px] border border-white/90 bg-[#fffdf8]/95 shadow-[0_24px_70px_rgba(14,40,49,0.28)] backdrop-blur-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-ink/8 px-5 py-4">
            <div className="grid size-9 place-items-center rounded-[12px] bg-coral text-ink">
              <Sparkles className="size-4" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-black">
                  {attendeeMode ? "EventForge Recommender" : "EventForge Copilot"}
                </p>
                {!attendeeMode && (
                  <span className="rounded-full bg-[#f6c8b5]/60 px-1.5 py-0.5 text-[9px] font-black text-[#9f503d]">
                    BETA
                  </span>
                )}
              </div>
              <p className="truncate text-[9px] text-white/55">
                {attendeeMode ? "Personalized session picks" : `Event assistant · ${eventTitle}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={expanded ? "Collapse chat" : "Expand chat"}
                onClick={() => setExpanded((v) => !v)}
                className="grid size-8 place-items-center rounded-full bg-white/60 text-ink/45 transition hover:bg-white hover:text-ink"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => onOpenChange?.(false)}
                className="grid size-8 place-items-center rounded-full bg-white/60 text-ink/45 transition hover:bg-white hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Mode toggle (attendee mode) */}
          {attendeeMode && (
            <div className="flex border-b border-ink/8 bg-ink/[0.02] px-4 py-2">
              <button
                type="button"
                onClick={() => setMode("recommend")}
                className={`flex-1 rounded-full px-3 py-1 text-[10px] font-bold transition ${
                  mode === "recommend"
                    ? "bg-coral text-ink shadow-[0_6px_12px_rgba(240,123,103,0.2)]"
                    : "bg-white/60 text-ink/55 hover:bg-white/80"
                }`}
              >
                Recommendations
              </button>
              <button
                type="button"
                onClick={() => setMode("generate")}
                className={`flex-1 rounded-full px-3 py-1 text-[10px] font-bold transition ${
                  mode === "generate"
                    ? "bg-coral text-ink shadow-[0_6px_12px_rgba(240,123,103,0.2)]"
                    : "bg-white/60 text-ink/55 hover:bg-white/80"
                }`}
              >
                Draft content
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5 border-b border-ink/8 px-4 py-2.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={generating}
                onClick={() => handleQuickAction(action.prompt)}
                className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold transition ${
                  action.variant === "outline"
                    ? "border border-ink/10 bg-white/60 text-ink/65 hover:bg-white hover:text-ink"
                    : "bg-[#e5eee9] text-ink/65 hover:bg-[#d5e6da]"
                } ${generating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className={`max-h-[340px] overflow-y-auto px-4 ${expanded ? "max-h-[60vh]" : ""} pb-3 pt-3`}>
            <div className="space-y-3">
              {typedMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.timestamp}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[14px] px-3.5 py-2.5 text-[11px] leading-5 ${
                      message.role === "user"
                        ? "bg-coral text-ink"
                        : message.role === "system"
                        ? "bg-amber/10 text-[#7a4a14]"
                        : "bg-ink/6 text-ink/70"
                    }`}
                  >
                    {message.text.split("\n").map((para, i) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {para}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {generating && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-[14px] bg-ink/6 px-4 py-3">
                    <Loader2 className="size-3.5 animate-spin text-ink/40" />
                    <span className="text-[11px] text-ink/50">Drafting...</span>
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-ink/8 p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={attendeeMode ? "Ask for session recommendations..." : "Ask about your event..."}
              disabled={generating}
              className="min-w-0 flex-1 h-9 rounded-[12px] border border-ink/10 bg-ink/4 px-3 py-1.5 text-[12px] font-medium outline-none ring-coral/20 transition placeholder:text-ink/35 focus:bg-white/70 focus:ring-4 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || generating}
              aria-label="Send message"
              className={`flex size-9 items-center justify-center rounded-full border transition ${
                input.trim() && !generating
                  ? "border-coral bg-coral text-ink shadow-[0_6px_14px_rgba(240,123,103,0.28)] hover:bg-[#f58c79] hover:-translate-y-0.5"
                  : "border-ink/10 bg-ink/5 text-ink/30 cursor-not-allowed"
              }`}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin text-ink/60" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
