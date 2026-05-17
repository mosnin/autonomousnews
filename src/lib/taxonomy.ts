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
      "AI, software, hardware and the platforms reshaping modern life.",
    subcategories: [
      { slug: "ai-and-ml", name: "AI & ML", description: "Frontier models, agents and the machine-learning systems behind them." },
      { slug: "software", name: "Software", description: "Developer tools, open source and the platforms engineers build on." },
      { slug: "hardware-and-chips", name: "Hardware & Chips", description: "Semiconductors, devices and the supply chain that delivers them." },
      { slug: "internet-and-platforms", name: "Internet & Platforms", description: "Social networks, search and the companies that run the open web." },
      { slug: "cybersecurity", name: "Cybersecurity", description: "Breaches, vulnerabilities and the contest between attackers and defenders." },
    ],
  },
  {
    slug: "business",
    name: "Business",
    description:
      "Markets, companies and the economics of the technology industry.",
    subcategories: [
      { slug: "startups-and-venture", name: "Startups & Venture", description: "Founders, funding rounds and the venture capital market." },
      { slug: "markets", name: "Markets", description: "Public equities, IPOs and the trading of technology stocks." },
      { slug: "media-and-streaming", name: "Media & Streaming", description: "The streaming wars and the business of digital media." },
      { slug: "crypto-and-fintech", name: "Crypto & Fintech", description: "Digital assets, payments and the financial technology sector." },
    ],
  },
  {
    slug: "science",
    name: "Science",
    description:
      "Discoveries from space, biology, climate and the frontiers of research.",
    subcategories: [
      { slug: "space", name: "Space", description: "Spaceflight, telescopes and the exploration of the cosmos." },
      { slug: "biotech", name: "Biotech", description: "Genetics, drug development and the science of life." },
      { slug: "climate-science", name: "Climate Science", description: "Research on a warming planet and the systems that model it." },
      { slug: "physics-and-math", name: "Physics & Math", description: "Fundamental research from particle physics to pure mathematics." },
    ],
  },
  {
    slug: "climate",
    name: "Climate",
    description:
      "The energy transition and the technologies built to address it.",
    subcategories: [
      { slug: "clean-energy", name: "Clean Energy", description: "Solar, wind, nuclear, batteries and the grid that connects them." },
      { slug: "transportation", name: "Transportation", description: "Electric vehicles, aviation and the decarbonization of mobility." },
      { slug: "policy-and-cop", name: "Policy & COP", description: "Climate diplomacy, regulation and the annual COP negotiations." },
    ],
  },
  {
    slug: "policy",
    name: "Policy",
    description:
      "The laws, regulators and geopolitics shaping the technology sector.",
    subcategories: [
      { slug: "antitrust-and-regulation", name: "Antitrust & Regulation", description: "Competition cases and the rule-making aimed at large technology firms." },
      { slug: "privacy-and-data", name: "Privacy & Data", description: "Surveillance, data protection law and the rights of users online." },
      { slug: "ai-policy", name: "AI Policy", description: "Government efforts to govern artificial intelligence and its risks." },
      { slug: "geopolitics-of-tech", name: "Geopolitics of Tech", description: "Export controls, sanctions and the contest over critical technologies." },
    ],
  },
  {
    slug: "opinion",
    name: "Opinion",
    description:
      "Argument and analysis on technology, the industry and its consequences.",
    subcategories: [
      { slug: "tech-criticism", name: "Tech Criticism", description: "Skeptical analysis of the products and companies shaping daily life." },
      { slug: "essays", name: "Essays", description: "Long-form argument from staff and outside contributors." },
      { slug: "letters", name: "Letters", description: "Readers respond to the reporting." },
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
