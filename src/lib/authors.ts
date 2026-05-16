export type Author = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  // Beat = primary categories this author covers. The agent prefers
  // an author whose beat includes the article's category/subcategory.
  beat: string[];
  // Optional sub-beats (subcategory slugs). When set, used to break ties.
  subBeat?: string[];
  // Stable initials used in avatar placeholders.
  initials: string;
  // Month/year the reporter joined Techno Times — drives "Covering X since"
  // tenure copy on profile + article pages.
  joinedAt: string; // YYYY-MM
  // Optional social handles (omit to render nothing).
  links?: {
    x?: string;          // 'mira.chen' -> https://x.com/mira.chen
    linkedin?: string;   // 'mira-chen'
    mastodon?: string;   // full URL (Mastodon instances vary)
    web?: string;
  };
};

export const AUTHORS: Author[] = [
  {
    slug: "mira-chen",
    name: "Mira Chen",
    title: "Senior Technology Correspondent",
    bio:
      "Mira Chen covers artificial intelligence and the platforms reshaping how we work. She writes about frontier labs, agents, and the policy debates that follow them.",
    beat: ["technology"],
    subBeat: ["artificial-intelligence", "software", "big-tech"],
    initials: "MC",
    joinedAt: "2024-06",
    links: { x: "technotimes_mira", linkedin: "mira-chen" },
  },
  {
    slug: "jordan-park",
    name: "Jordan Park",
    title: "National Security Reporter",
    bio:
      "Jordan Park reports on national security, the Pentagon, and the intersection of statecraft and technology.",
    beat: ["politics", "us", "world"],
    subBeat: ["foreign-policy", "white-house", "conflicts"],
    initials: "JP",
    joinedAt: "2023-09",
    links: { x: "jordan_park_tt", linkedin: "jordan-park" },
  },
  {
    slug: "anya-patel",
    name: "Anya Patel",
    title: "Science Correspondent",
    bio:
      "Anya Patel covers space, robotics, and the science that shapes the world beyond the headlines.",
    beat: ["science"],
    subBeat: ["space", "robotics", "research"],
    initials: "AP",
    joinedAt: "2024-01",
    links: { x: "anyapatel_space", linkedin: "anya-patel" },
  },
  {
    slug: "sam-reyes",
    name: "Sam Reyes",
    title: "Markets Reporter",
    bio:
      "Sam Reyes writes about global markets, the macro economy, and the stories behind the numbers.",
    beat: ["business"],
    subBeat: ["markets", "economy", "dealbook"],
    initials: "SR",
    joinedAt: "2022-11",
    links: { x: "sam_reyes", linkedin: "sam-reyes" },
  },
  {
    slug: "lucas-brandt",
    name: "Lucas Brandt",
    title: "Cybersecurity Reporter",
    bio:
      "Lucas Brandt covers cyberattacks, vulnerabilities, and the contest between defenders and the people trying to break in.",
    beat: ["technology", "us"],
    subBeat: ["cybersecurity", "justice"],
    initials: "LB",
    joinedAt: "2024-03",
    links: { x: "lbrandt_cyber", linkedin: "lucas-brandt" },
  },
  {
    slug: "hanna-mueller",
    name: "Hanna Mueller",
    title: "Europe Correspondent",
    bio:
      "Hanna Mueller reports from across Europe on politics, regulation, and the continent's place in a shifting world.",
    beat: ["world", "politics"],
    subBeat: ["europe", "foreign-policy"],
    initials: "HM",
    joinedAt: "2023-04",
    links: { x: "hmueller_eu", linkedin: "hanna-mueller" },
  },
  {
    slug: "yumi-tanaka",
    name: "Yumi Tanaka",
    title: "Asia Pacific Correspondent",
    bio:
      "Yumi Tanaka covers the Asia Pacific, with a focus on the region's economies and the technology companies driving them.",
    beat: ["world", "business", "technology"],
    subBeat: ["asia-pacific"],
    initials: "YT",
    joinedAt: "2023-10",
    links: { x: "yumi_tanaka_tt", linkedin: "yumi-tanaka" },
  },
  {
    slug: "marcus-aoki",
    name: "Marcus Aoki",
    title: "Climate Reporter",
    bio:
      "Marcus Aoki writes about the climate crisis, the energy transition, and the people on the front lines of both.",
    beat: ["climate", "science"],
    subBeat: ["crisis", "energy", "environment"],
    initials: "MA",
    joinedAt: "2024-02",
    links: { x: "marcus_climate", linkedin: "marcus-aoki" },
  },
  {
    slug: "sofia-ruiz",
    name: "Sofia Ruiz",
    title: "Health Reporter",
    bio:
      "Sofia Ruiz covers public health, medicine, and the science of how people stay well.",
    beat: ["health", "science"],
    subBeat: ["public-health", "medicine", "wellness"],
    initials: "SR",
    joinedAt: "2024-04",
    links: { x: "sofia_ruiz_md", linkedin: "sofia-ruiz" },
  },
  {
    slug: "theo-kane",
    name: "Theo Kane",
    title: "Senior Sports Writer",
    bio:
      "Theo Kane covers the leagues, athletes, and big moments that move the sports world.",
    beat: ["sports"],
    initials: "TK",
    joinedAt: "2022-08",
    links: { x: "theo_kane", linkedin: "theo-kane" },
  },
  {
    slug: "beatrice-lavigne",
    name: "Beatrice Lavigne",
    title: "Arts & Culture Critic",
    bio:
      "Beatrice Lavigne writes about film, television, and the wider culture they reflect.",
    beat: ["arts", "culture"],
    subBeat: ["film", "television", "celebrity"],
    initials: "BL",
    joinedAt: "2023-06",
    links: { x: "b_lavigne", linkedin: "beatrice-lavigne" },
  },
  {
    slug: "devin-okafor",
    name: "Devin Okafor",
    title: "Internet Culture Reporter",
    bio:
      "Devin Okafor covers the always-online world of memes, creators, and the platforms they live on.",
    beat: ["culture", "technology"],
    subBeat: ["internet-culture", "internet"],
    initials: "DO",
    joinedAt: "2024-05",
    links: { x: "devin_okafor", linkedin: "devin-okafor" },
  },
  {
    slug: "priya-shah",
    name: "Priya Shah",
    title: "Software & Developer Reporter",
    bio:
      "Priya Shah covers software, open source, and the people building the tools the internet runs on.",
    beat: ["technology"],
    subBeat: ["software", "internet"],
    initials: "PS",
    joinedAt: "2024-07",
    links: { x: "priyashah_dev", linkedin: "priya-shah" },
  },
  {
    slug: "noah-whitfield",
    name: "Noah Whitfield",
    title: "Real Estate Reporter",
    bio:
      "Noah Whitfield writes about housing markets, the people buying and renting in them, and the policies that shape both.",
    beat: ["real-estate", "business"],
    initials: "NW",
    joinedAt: "2023-02",
    links: { x: "noah_whitfield", linkedin: "noah-whitfield" },
  },
  {
    slug: "elena-kovac",
    name: "Elena Kovac",
    title: "Editorial Board Member",
    bio:
      "Elena Kovac writes for the Techno Times editorial board on global affairs, the economy, and the tensions between them.",
    beat: ["opinion", "world", "business"],
    initials: "EK",
    joinedAt: "2022-05",
    links: { x: "elena_kovac", linkedin: "elena-kovac" },
  },
];

export const AUTHOR_BY_SLUG = new Map(AUTHORS.map((a) => [a.slug, a]));

export function findAuthor(slug: string): Author | undefined {
  return AUTHOR_BY_SLUG.get(slug);
}

// Pick the on-beat author for a given (category, subcategory). Deterministic
// so the same topic written by the same agent run keeps the same byline if
// re-generated. Falls back to a generic "Techno Times Staff" if nothing matches.
export function selectAuthorForTopic(
  categorySlug: string,
  subcategorySlug: string | null
): Author {
  const subMatches = AUTHORS.filter(
    (a) =>
      a.beat.includes(categorySlug) &&
      subcategorySlug != null &&
      (a.subBeat ?? []).includes(subcategorySlug)
  );
  if (subMatches.length > 0) return subMatches[0];

  const catMatches = AUTHORS.filter((a) => a.beat.includes(categorySlug));
  if (catMatches.length > 0) return catMatches[0];

  return AUTHORS[AUTHORS.length - 1]; // Elena Kovac as fallback
}
