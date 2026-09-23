import { Link } from "wouter";
import { useTranslation } from "@/i18n";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="eventforge-shell flex min-h-screen flex-col text-ink">
      <header className="flex items-center gap-3 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="eventforge-mark grid size-9 place-items-center rounded-[12px] bg-ink text-[11px] font-black text-white">
            EF
          </span>
          <span className="font-display text-[17px] font-bold tracking-[-0.04em]">
            {t("brand.name")}
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-center px-5 pb-16 sm:px-8">
        <div className="mx-auto w-full max-w-[720px] text-center">
          <p className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-coral">
            <span className="size-1.5 rounded-full bg-coral" />{" "}
            {t("notFound.eyebrow")}
          </p>
          <h1 className="font-display mt-4 text-[clamp(5rem,18vw,11rem)] font-bold leading-[0.85] tracking-[-0.08em]">
            {t("notFound.title")}
            <span className="text-coral">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[440px] text-[13px] leading-6 text-ink/55">
            {t("notFound.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="flex h-11 items-center gap-2 rounded-[13px] bg-coral px-5 text-[12px] font-black text-ink shadow-[0_9px_18px_rgba(240,123,103,0.22)] transition hover:-translate-y-0.5"
            >
              {t("nav.backToHome")}
            </Link>
            <Link
              href="/organizer"
              className="flex h-11 items-center gap-2 rounded-[13px] border border-ink/10 bg-white/65 px-5 text-[12px] font-black text-ink/70 transition hover:-translate-y-0.5 hover:bg-white"
            >
              {t("nav.openOrganizerDashboard")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
