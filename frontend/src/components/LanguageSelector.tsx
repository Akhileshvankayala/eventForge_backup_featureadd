import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useTranslation, type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSelector() {
  const { language, setLanguage, supportedLanguages, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = supportedLanguages.find((l) => l.code === language);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-[11px] border border-ink/8 bg-white/60 px-2.5 py-1.5 text-[11px] font-bold text-ink/60 transition hover:bg-white hover:text-ink"
      >
        <Globe className="size-3" />
        <span>{current?.nativeLabel ?? current?.label ?? "English"}</span>
        <ChevronDown className="size-3" />
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full right-0 z-[70] mt-1.5 w-44 rounded-[14px] border border-ink/10 bg-[#fffdf8]/95 py-1 shadow-[0_16px_40px_rgba(14,40,49,0.16)] backdrop-blur-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code as LanguageCode);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium transition",
                  language === lang.code
                    ? "bg-coral/10 text-coral"
                    : "text-ink/60 hover:bg-white/70 hover:text-ink",
                )}
              >
                <span
                  className={`grid size-5 place-items-center rounded-[8px] text-[9px] font-black ${
                    language === lang.code
                      ? "bg-coral text-white"
                      : "bg-ink/5 text-ink/40"
                  }`}
                >
                  {lang.code.toUpperCase()}
                </span>
                <span>{lang.nativeLabel}</span>
                {language === lang.code && (
                  <span className="ml-auto text-[10px] font-black text-coral">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
