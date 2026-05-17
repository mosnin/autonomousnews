// Per-section accent color identity. Each category gets a "fg" (used on
// light surfaces) and a "bg" (used as a fill chip). The colors are tuned
// so the foreground hits AA contrast on a white background, and the
// background hits AA contrast for white text.
export type SectionColor = {
  fg: string;     // text / kicker / border color, AA on #ffffff
  bg: string;     // chip / fill color, AA contrast for #ffffff text
  bgDark: string; // chip color tuned for dark mode
  fgDark: string; // text color tuned for dark mode
};

export const SECTION_COLORS: Record<string, SectionColor> = {
  world:        { fg: "#1f3a5f", bg: "#1f3a5f", fgDark: "#84b1ff", bgDark: "#2a5183" },
  us:           { fg: "#1f5232", bg: "#1f5232", fgDark: "#7adba0", bgDark: "#296b42" },
  politics:     { fg: "#9b1c1c", bg: "#9b1c1c", fgDark: "#ff8a8a", bgDark: "#b62a2a" },
  business:     { fg: "#1f5132", bg: "#1f5132", fgDark: "#83d8a4", bgDark: "#2a6c43" },
  technology:   { fg: "#0f5dd2", bg: "#0f5dd2", fgDark: "#7eb8ff", bgDark: "#1c6fe6" },
  science:      { fg: "#553c9a", bg: "#553c9a", fgDark: "#c4b3ff", bgDark: "#6a4dc0" },
  health:       { fg: "#0e7474", bg: "#0e7474", fgDark: "#76d6d6", bgDark: "#149090" },
  climate:      { fg: "#3e6b1f", bg: "#3e6b1f", fgDark: "#a8d77a", bgDark: "#52852b" },
  sports:       { fg: "#b8410c", bg: "#b8410c", fgDark: "#ff9c6e", bgDark: "#d44e10" },
  arts:         { fg: "#8d6e1a", bg: "#8d6e1a", fgDark: "#ecc659", bgDark: "#a78321" },
  culture:      { fg: "#a21e6c", bg: "#a21e6c", fgDark: "#ff80c5", bgDark: "#bc2882" },
  lifestyle:    { fg: "#9f1239", bg: "#9f1239", fgDark: "#ff8aa9", bgDark: "#b9184a" },
  food:         { fg: "#a14d2a", bg: "#a14d2a", fgDark: "#ffae87", bgDark: "#bd5d35" },
  travel:       { fg: "#0e7490", bg: "#0e7490", fgDark: "#69cce8", bgDark: "#1488ab" },
  "real-estate":{ fg: "#525252", bg: "#525252", fgDark: "#bdbdbd", bgDark: "#6b6b6b" },
  opinion:      { fg: "#1c1c1c", bg: "#1c1c1c", fgDark: "#e5e5e5", bgDark: "#404040" },
};

const FALLBACK: SectionColor = SECTION_COLORS.opinion;

export function sectionColor(slug: string | null | undefined): SectionColor {
  if (!slug) return FALLBACK;
  return SECTION_COLORS[slug] ?? FALLBACK;
}

// Returns 'ink' or 'paper' depending on which gives better contrast on the
// section background. Uses a simple luminance threshold — for hex like
// '#0f5dd2'. Threshold 140 puts mid-luminance accents (e.g. the yellow
// arts/lifestyle hues) onto dark ink, while the darker blues/greens get
// paper-colored text.
export function sectionTextContrast(
  slug: string | null | undefined
): "ink" | "paper" {
  const { bg } = sectionColor(slug);
  const hex = bg.replace(/^#/, "");
  if (hex.length !== 6) return "paper";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (
    Number.isNaN(r) ||
    Number.isNaN(g) ||
    Number.isNaN(b)
  ) {
    return "paper";
  }
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 140 ? "ink" : "paper";
}
