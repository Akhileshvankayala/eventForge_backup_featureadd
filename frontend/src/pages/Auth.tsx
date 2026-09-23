import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/i18n";

export default function Auth() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const query = useSearch();
  const params = new URLSearchParams(query);
  const event = params.get("event");
  const initialRole = params.get("role") === "organizer" ? "organizer" : "attendee";
  const [role, setRole] = useState<"attendee" | "organizer">(initialRole);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user =
        mode === "signup"
          ? await register(name.trim(), email.trim(), password, role)
          : await login(email.trim(), password);
      const dest =
        user.role === "organizer" || user.role === "admin" || user.role === "staff"
          ? "/organizer"
          : "/attendee";
      navigate(dest);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.loading");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f4ee] px-5 py-5 text-ink sm:px-8">
      <button
        onClick={() => navigate("/")}
        className="mx-auto flex w-full max-w-[1240px] items-center gap-2 text-[12px] font-bold text-ink/55 hover:text-ink"
      >
        <ArrowLeft className="size-4" /> {t("auth.back")}
      </button>
      <main className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1060px] items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="hidden rounded-[30px] bg-ink p-10 text-white shadow-[0_24px_52px_rgba(14,40,49,0.18)] lg:block">
          <div className="grid size-11 place-items-center rounded-[14px] bg-coral text-ink">
            <Sparkles className="size-5" />
          </div>
          <p className="mt-12 text-[10px] font-black uppercase tracking-[0.2em] text-coral">
            {t("auth.tagline")}
          </p>
          <h1 className="mt-4 font-display text-[54px] font-bold leading-[0.92] tracking-[-0.08em]">
            {t("auth.makeSpace")}
            <br />
            <span className="text-coral">{t("auth.forIdeas")}</span>
          </h1>
          <p className="mt-6 max-w-[320px] text-[13px] leading-6 text-white/55">
            {t("auth.subtitle")}
          </p>
          <div className="mt-14 space-y-3 text-[11px] font-bold text-white/65">
            <p className="flex items-center gap-2">
              <Check className="size-4 text-mint" /> {t("auth.features.ticket1")}
            </p>
            <p className="flex items-center gap-2">
              <Check className="size-4 text-mint" /> {t("auth.features.ticket2")}
            </p>
            <p className="flex items-center gap-2">
              <Check className="size-4 text-mint" /> {t("auth.features.ticket3")}
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[470px] rounded-[28px] border border-white bg-white/65 p-6 shadow-[0_20px_46px_rgba(47,59,61,0.08)] backdrop-blur-xl sm:p-8">
          <div className="mb-7 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
                {t("auth.welcome")}
              </p>
              <h2 className="mt-2 font-display text-[31px] font-bold tracking-[-0.07em]">
                {mode === "signup" ? t("auth.signup.title") : t("auth.login.title")}
              </h2>
              <p className="mt-2 text-[12px] text-ink/50">
                {event
                  ? `${t("auth.eventParam", "Event")}: ${event}`
                  : mode === "signup"
                    ? t("auth.signup.switchToLogin") + " " + t("auth.signup.signIn").toLowerCase()
                    : t("auth.login.switchToSignup") + " " + t("auth.login.signUp").toLowerCase()}
              </p>
            </div>
            <LanguageSelector />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-ink/40">
                  {t("auth.fields.name")}
                </label>
                <input
                  type="text"
                  placeholder={t("auth.fields.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-[12px] border border-ink/8 bg-white/70 px-3 text-[13px] font-medium outline-none placeholder:text-ink/35 focus:bg-white/90"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-ink/40">
                {t("auth.fields.email")}
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
                <input
                  type="email"
                  placeholder={t("auth.fields.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-[12px] border border-ink/8 bg-white/70 pl-10 pr-3 text-[13px] font-medium outline-none placeholder:text-ink/35 focus:bg-white/90"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-ink/40">
                {t("auth.fields.password")}
              </label>
              <div className="relative mt-1.5">
                <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.fields.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-[12px] border border-ink/8 bg-white/70 pl-10 pr-10 text-[13px] font-medium outline-none placeholder:text-ink/35 focus:bg-white/90"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-ink/40">
                  Role
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("attendee")}
                    className={`rounded-[12px] border p-3 text-center text-[13px] font-bold transition ${
                      role === "attendee"
                        ? "border-coral bg-coral/10 text-coral"
                        : "border-ink/8 bg-white/50 text-ink/50 hover:bg-white"
                    }`}
                  >
                    {t("auth.roles.attendee")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("organizer")}
                    className={`rounded-[12px] border p-3 text-center text-[13px] font-bold transition ${
                      role === "organizer"
                        ? "border-coral bg-coral/10 text-coral"
                        : "border-ink/8 bg-white/50 text-ink/50 hover:bg-white"
                    }`}
                  >
                    {t("auth.roles.organizer")}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-[12px] border border-[#fec89a]/50 bg-[#fef0e5] px-3 py-2 text-[11px] text-[#9a2a1c]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[12px] bg-coral py-3 text-[12px] font-black text-ink shadow-[0_9px_18px_rgba(240,123,103,0.22)] transition hover:bg-[#f58c79] disabled:opacity-60"
            >
              {loading ? (mode === "signup" ? t("auth.loading") : t("auth.signingIn")) : mode === "signup" ? t("auth.buttons.createAccount") : t("auth.buttons.signIn")}
            </button>
          </form>

          <div className="mt-6 text-center text-[12px]">
            {mode === "signup" ? (
              <>
                <span className="text-ink/50">{t("auth.signup.switchToLogin")}</span>{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-bold text-coral hover:underline"
                >
                  {t("auth.signup.signIn")}
                </button>
              </>
            ) : (
              <>
                <span className="text-ink/50">{t("auth.login.switchToSignup")}</span>{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-bold text-coral hover:underline"
                >
                  {t("auth.login.signUp")}
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
