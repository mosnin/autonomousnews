export const SITE = {
  name: "Techno Times",
  shortName: "Techno Times",
  tagline: "The technology newspaper of record.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://technotimes.com",
  description:
    "Breaking technology news, in-depth reporting on AI, business, science and the policies shaping the modern world.",
  locale: "en_US",
  twitter: "@technotimes",
};

export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";
export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";
export const GSC_VERIFICATION =
  process.env.NEXT_PUBLIC_GSC_VERIFICATION ?? "";

export const DAILY_BUDGET_USD = Number(
  process.env.DAILY_BUDGET_USD ?? "10"
);
