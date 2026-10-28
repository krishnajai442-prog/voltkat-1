export type GradientThemeId =
  | "MIDNIGHT"
  | "VIOLET_STORM"
  | "ELECTRIC_AZURE"
  | "EMERALD_TECH"
  | "SUNSET_DEAL"
  | "STEEL_GRAPHITE";

export type SlideGradient = {
  id: GradientThemeId;
  label: string;
  stage: string;
  glow: string;
  badge: string;
  headline: string;
  ring: string;
  swatch: string;
};

export const SLIDE_GRADIENTS: Record<GradientThemeId, SlideGradient> = {
  MIDNIGHT: {
    id: "MIDNIGHT",
    label: "Midnight Navy",
    stage:
      "bg-[radial-gradient(120%_120%_at_85%_10%,#12245c_0%,#0a1024_55%,#05070f_100%)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(37,99,255,0.55),transparent_62%)]",
    badge: "from-blue-500/90 to-indigo-500/90",
    headline: "from-blue-400 via-sky-300 to-violet-400",
    ring: "ring-blue-400/25",
    swatch: "linear-gradient(135deg,#0a1024,#2563ff,#7c3aed)",
  },
  VIOLET_STORM: {
    id: "VIOLET_STORM",
    label: "Violet Storm",
    stage:
      "bg-[radial-gradient(120%_120%_at_80%_15%,#3b0764_0%,#1e1b4b_55%,#05070f_100%)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.55),transparent_62%)]",
    badge: "from-violet-500/90 to-fuchsia-500/90",
    headline: "from-violet-300 via-fuchsia-300 to-indigo-300",
    ring: "ring-violet-400/25",
    swatch: "linear-gradient(135deg,#1e1b4b,#7c3aed,#d946ef)",
  },
  ELECTRIC_AZURE: {
    id: "ELECTRIC_AZURE",
    label: "Electric Azure",
    stage:
      "bg-[radial-gradient(120%_120%_at_85%_10%,#082f49_0%,#0c4a6e_55%,#05070f_100%)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.55),transparent_62%)]",
    badge: "from-sky-500/90 to-cyan-400/90",
    headline: "from-sky-300 via-cyan-200 to-blue-300",
    ring: "ring-sky-400/25",
    swatch: "linear-gradient(135deg,#0c4a6e,#0ea5e9,#22d3ee)",
  },
  EMERALD_TECH: {
    id: "EMERALD_TECH",
    label: "Emerald Tech",
    stage:
      "bg-[radial-gradient(120%_120%_at_85%_10%,#064e3b_0%,#065f46_55%,#05070f_100%)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.50),transparent_62%)]",
    badge: "from-emerald-500/90 to-teal-400/90",
    headline: "from-emerald-300 via-teal-200 to-green-300",
    ring: "ring-emerald-400/25",
    swatch: "linear-gradient(135deg,#064e3b,#10b981,#2dd4bf)",
  },
  SUNSET_DEAL: {
    id: "SUNSET_DEAL",
    label: "Sunset Deal",
    stage:
      "bg-[radial-gradient(120%_120%_at_85%_10%,#7c2d12_0%,#9a3412_50%,#05070f_100%)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.55),transparent_62%)]",
    badge: "from-orange-500/90 to-rose-500/90",
    headline: "from-amber-300 via-orange-300 to-rose-300",
    ring: "ring-orange-400/25",
    swatch: "linear-gradient(135deg,#7c2d12,#f97316,#fb7185)",
  },
  STEEL_GRAPHITE: {
    id: "STEEL_GRAPHITE",
    label: "Steel Graphite",
    stage:
      "bg-[radial-gradient(120%_120%_at_85%_10%,#111827_0%,#1f2937_55%,#05070f_100%)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.38),transparent_62%)]",
    badge: "from-slate-500/90 to-zinc-400/90",
    headline: "from-slate-200 via-zinc-200 to-gray-300",
    ring: "ring-slate-400/25",
    swatch: "linear-gradient(135deg,#111827,#475569,#cbd5e1)",
  },
};

export function gradientFor(id: string | null | undefined): SlideGradient {
  const key = (id ?? "MIDNIGHT") as GradientThemeId;
  return SLIDE_GRADIENTS[key] ?? SLIDE_GRADIENTS.MIDNIGHT;
}