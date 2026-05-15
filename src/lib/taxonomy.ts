export type Subcategory = {
  slug: string;
  name: string;
  description: string;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "technology",
    name: "Technology",
    description:
      "AI, software, hardware, cybersecurity and the companies shaping the modern internet.",
    subcategories: [
      { slug: "artificial-intelligence", name: "Artificial Intelligence", description: "Frontier models, agents, and the AI economy." },
      { slug: "software", name: "Software", description: "Developer tools, open source, and platforms." },
      { slug: "hardware", name: "Hardware", description: "Chips, devices, robotics and consumer electronics." },
      { slug: "cybersecurity", name: "Cybersecurity", description: "Breaches, vulnerabilities, and digital defense." },
      { slug: "internet", name: "Internet", description: "Social media, search, browsers, and the open web." },
      { slug: "gadgets", name: "Gadgets", description: "Reviews and launches across consumer tech." },
    ],
  },
  {
    slug: "business",
    name: "Business",
    description:
      "Markets, deals, and the financial side of the technology industry.",
    subcategories: [
      { slug: "startups", name: "Startups", description: "Funding rounds, founders, and venture capital." },
      { slug: "markets", name: "Markets", description: "Public markets, earnings, and macro." },
      { slug: "crypto", name: "Crypto", description: "Digital assets, blockchains, and regulation." },
      { slug: "economy", name: "Economy", description: "Jobs, trade, and economic policy." },
      { slug: "companies", name: "Companies", description: "Profiles and deep-dives on industry players." },
    ],
  },
  {
    slug: "science",
    name: "Science",
    description:
      "Discoveries from space, climate, biology and the labs pushing knowledge forward.",
    subcategories: [
      { slug: "space", name: "Space", description: "Spaceflight, telescopes, and the cosmos." },
      { slug: "climate", name: "Climate", description: "Climate change, energy, and the environment." },
      { slug: "health", name: "Health", description: "Medicine, biotech, and public health." },
      { slug: "research", name: "Research", description: "New studies and scientific frontiers." },
    ],
  },
  {
    slug: "world",
    name: "World",
    description:
      "International coverage with a technology and policy lens.",
    subcategories: [
      { slug: "americas", name: "Americas", description: "News from across the Americas." },
      { slug: "europe", name: "Europe", description: "Politics, regulation and tech across Europe." },
      { slug: "asia", name: "Asia", description: "Reporting from Asia-Pacific." },
      { slug: "africa", name: "Africa", description: "Africa's growing technology and political stories." },
      { slug: "middle-east", name: "Middle East", description: "Coverage from across the Middle East." },
    ],
  },
  {
    slug: "politics",
    name: "Politics",
    description:
      "Policy, elections, and the regulation of an increasingly technological world.",
    subcategories: [
      { slug: "policy", name: "Policy", description: "Lawmaking, agencies, and regulation." },
      { slug: "elections", name: "Elections", description: "Campaigns and voting." },
      { slug: "national-security", name: "National Security", description: "Defense, intelligence, and cyber." },
    ],
  },
  {
    slug: "culture",
    name: "Culture",
    description:
      "Entertainment, gaming, and the way technology is reshaping daily life.",
    subcategories: [
      { slug: "gaming", name: "Gaming", description: "Games, esports, and the industry behind them." },
      { slug: "entertainment", name: "Entertainment", description: "Streaming, film, and TV." },
      { slug: "lifestyle", name: "Lifestyle", description: "How technology fits into everyday life." },
      { slug: "arts", name: "Arts", description: "Design, music, and the creative industries." },
    ],
  },
  {
    slug: "opinion",
    name: "Opinion",
    description:
      "Analysis, editorials, and outside voices on technology and society.",
    subcategories: [
      { slug: "editorials", name: "Editorials", description: "Staff opinions and editorial board pieces." },
      { slug: "guest-essays", name: "Guest Essays", description: "Outside perspectives on the news." },
      { slug: "analysis", name: "Analysis", description: "In-depth analysis of major stories." },
    ],
  },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function findCategory(slug: string): Category | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

export function findSubcategory(
  categorySlug: string,
  subSlug: string
): { category: Category; subcategory: Subcategory } | undefined {
  const category = findCategory(categorySlug);
  if (!category) return undefined;
  const subcategory = category.subcategories.find((s) => s.slug === subSlug);
  if (!subcategory) return undefined;
  return { category, subcategory };
}
