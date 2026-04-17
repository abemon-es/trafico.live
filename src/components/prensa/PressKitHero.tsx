import { Newspaper } from "lucide-react";

interface PressKitHeroProps {
  title?: string;
  tagline?: string;
}

export function PressKitHero({
  title = "Kit de prensa trafico.live",
  tagline = "La plataforma de inteligencia de movilidad multimodal para España.",
}: PressKitHeroProps) {
  return (
    <section className="bg-gradient-to-br from-tl-900 via-tl-800 to-tl-700 dark:from-gray-950 dark:via-tl-950 dark:to-tl-900 rounded-2xl px-8 py-12 text-white overflow-hidden relative">
      {/* Background decoration */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, #6393ff 0%, transparent 60%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-white/10">
            <Newspaper className="h-6 w-6 text-tl-200" />
          </div>
          <span className="text-tl-300 text-sm font-semibold uppercase tracking-wide">
            Kit de prensa
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4 leading-tight">
          {title}
        </h1>

        <p className="text-tl-100 text-lg max-w-2xl leading-relaxed mb-6">
          {tagline}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-tl-100">
          <span className="font-mono text-tl-300">📧</span>
          <span>
            Contacto de prensa:{" "}
            <a
              href="mailto:prensa@trafico.live"
              className="text-white hover:underline font-semibold"
            >
              prensa@trafico.live
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}
