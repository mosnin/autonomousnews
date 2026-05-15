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
