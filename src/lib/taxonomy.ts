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
    slug: "world",
    name: "World",
    description:
      "International news, conflicts, diplomacy and the forces shaping the global order.",
    subcategories: [
      { slug: "americas", name: "Americas", description: "News from across North, Central and South America." },
      { slug: "europe", name: "Europe", description: "Politics, security and society across Europe." },
      { slug: "asia-pacific", name: "Asia Pacific", description: "Coverage from East, Southeast and South Asia and Oceania." },
      { slug: "africa", name: "Africa", description: "Reporting from across the African continent." },
      { slug: "middle-east", name: "Middle East", description: "News and analysis from across the Middle East." },
      { slug: "conflicts", name: "Conflicts", description: "Wars, ceasefires, and humanitarian crises." },
    ],
  },
  {
    slug: "us",
    name: "U.S.",
    description:
      "American politics, society, and the institutions that govern daily life.",
    subcategories: [
      { slug: "politics", name: "Politics", description: "Federal and state politics across the United States." },
      { slug: "education", name: "Education", description: "Schools, universities and the policies behind them." },
      { slug: "justice", name: "Justice", description: "Courts, policing and the law." },
      { slug: "immigration", name: "Immigration", description: "Border policy and the lives of newcomers." },
      { slug: "race", name: "Race", description: "Race, identity and civil rights." },
      { slug: "regions", name: "Regions", description: "Stories from across America's regions and states." },
    ],
  },
  {
    slug: "politics",
    name: "Politics",
    description:
      "Elections, government and the contests shaping policy worldwide.",
    subcategories: [
      { slug: "elections", name: "Elections", description: "Campaigns, primaries and voting." },
      { slug: "white-house", name: "White House", description: "The executive branch and the presidency." },
      { slug: "congress", name: "Congress", description: "Lawmaking on Capitol Hill." },
      { slug: "supreme-court", name: "Supreme Court", description: "The court that shapes American law." },
      { slug: "policy", name: "Policy", description: "How laws and regulations are made." },
      { slug: "foreign-policy", name: "Foreign Policy", description: "Diplomacy, alliances and global strategy." },
    ],
  },
  {
    slug: "business",
    name: "Business",
    description:
      "Markets, economies and the companies shaping global commerce.",
    subcategories: [
      { slug: "markets", name: "Markets", description: "Stocks, bonds, currencies and commodities." },
      { slug: "economy", name: "Economy", description: "Jobs, inflation, trade and macroeconomic trends." },
      { slug: "dealbook", name: "DealBook", description: "Mergers, acquisitions and major corporate transactions." },
      { slug: "companies", name: "Companies", description: "Profiles and deep-dives on industry players." },
      { slug: "workplace", name: "Workplace", description: "Work, careers and the future of the office." },
      { slug: "personal-finance", name: "Personal Finance", description: "Saving, spending and household money." },
    ],
  },
  {
    slug: "technology",
    name: "Technology",
    description:
      "AI, software, hardware and the platforms reshaping modern life.",
    subcategories: [
      { slug: "artificial-intelligence", name: "Artificial Intelligence", description: "Frontier models, agents and the AI economy." },
      { slug: "cybersecurity", name: "Cybersecurity", description: "Breaches, vulnerabilities and digital defense." },
      { slug: "internet", name: "Internet", description: "Social media, search, browsers and the open web." },
      { slug: "hardware", name: "Hardware", description: "Chips, devices, robotics and consumer electronics." },
      { slug: "software", name: "Software", description: "Developer tools, open source and platforms." },
      { slug: "big-tech", name: "Big Tech", description: "Apple, Google, Microsoft, Amazon, Meta and the rest." },
    ],
  },
  {
    slug: "science",
    name: "Science",
    description:
      "Discoveries from space, archaeology, robotics and the frontiers of research.",
    subcategories: [
      { slug: "space", name: "Space", description: "Spaceflight, telescopes and the cosmos." },
      { slug: "research", name: "Research", description: "New studies and scientific breakthroughs." },
      { slug: "archaeology", name: "Archaeology", description: "Ancient civilizations and what we are still learning from them." },
      { slug: "robotics", name: "Robotics", description: "Machines that move, sense and work alongside us." },
      { slug: "genetics", name: "Genetics", description: "DNA, evolution and the science of life." },
    ],
  },
  {
    slug: "health",
    name: "Health",
    description:
      "Medicine, public health and the science of well-being.",
    subcategories: [
      { slug: "public-health", name: "Public Health", description: "Outbreaks, vaccines and global health systems." },
      { slug: "medicine", name: "Medicine", description: "Treatments, drugs and clinical research." },
      { slug: "mental-health", name: "Mental Health", description: "Anxiety, depression and the science of mind." },
      { slug: "wellness", name: "Wellness", description: "Sleep, fitness and everyday health." },
      { slug: "aging", name: "Aging", description: "Longevity and the science of getting older." },
    ],
  },
  {
    slug: "climate",
    name: "Climate",
    description:
      "The climate crisis, energy transition and the natural world.",
    subcategories: [
      { slug: "crisis", name: "Climate Crisis", description: "Warming, emissions and the global response." },
      { slug: "energy", name: "Energy", description: "Oil, gas, renewables and the grid." },
      { slug: "environment", name: "Environment", description: "Pollution, conservation and ecosystems." },
      { slug: "animals", name: "Animals", description: "Wildlife and the species we share the planet with." },
      { slug: "weather", name: "Weather", description: "Storms, heatwaves and extreme weather events." },
    ],
  },
  {
    slug: "sports",
    name: "Sports",
    description:
      "Coverage of leagues, athletes and the games that capture the world.",
    subcategories: [
      { slug: "soccer", name: "Soccer", description: "The world's game, from the Premier League to the World Cup." },
      { slug: "football", name: "Football", description: "American football, the NFL and college." },
      { slug: "basketball", name: "Basketball", description: "NBA, WNBA and college basketball." },
      { slug: "baseball", name: "Baseball", description: "MLB and the international game." },
      { slug: "tennis", name: "Tennis", description: "Grand Slams and the ATP/WTA tours." },
      { slug: "olympics", name: "Olympics", description: "The summer and winter Games." },
      { slug: "auto-racing", name: "Auto Racing", description: "Formula 1, NASCAR and motorsports." },
    ],
  },
  {
    slug: "arts",
    name: "Arts",
    description:
      "Film, television, theater, music, books and the creative industries.",
    subcategories: [
      { slug: "film", name: "Film", description: "Reviews, releases and the industry." },
      { slug: "television", name: "Television", description: "Series, streaming and the screen at home." },
      { slug: "music", name: "Music", description: "Releases, artists and the business of music." },
      { slug: "books", name: "Books", description: "Reviews, publishing and literary culture." },
      { slug: "theater", name: "Theater", description: "Broadway, the West End and stages everywhere." },
      { slug: "design", name: "Design", description: "Architecture, graphics and the visual world." },
    ],
  },
  {
    slug: "culture",
    name: "Culture",
    description:
      "How the internet, fame and identity are reshaping the way we live.",
    subcategories: [
      { slug: "internet-culture", name: "Internet Culture", description: "Memes, creators and the always-online life." },
      { slug: "celebrity", name: "Celebrity", description: "Fame and the people who carry it." },
      { slug: "style", name: "Style", description: "Fashion and the things we choose to wear." },
      { slug: "identity", name: "Identity", description: "Race, gender, sexuality and how we see ourselves." },
    ],
  },
  {
    slug: "lifestyle",
    name: "Lifestyle",
    description:
      "Relationships, parenting and the rhythms of modern life.",
    subcategories: [
      { slug: "relationships", name: "Relationships", description: "Love, family and connection." },
      { slug: "parenting", name: "Parenting", description: "Raising children in a changing world." },
      { slug: "home", name: "Home", description: "Where we live and how we live in it." },
      { slug: "beauty", name: "Beauty", description: "Skin, hair and the business of beauty." },
    ],
  },
  {
    slug: "food",
    name: "Food",
    description:
      "Restaurants, recipes, drinks and the industry behind every meal.",
    subcategories: [
      { slug: "restaurants", name: "Restaurants", description: "Reviews and dining trends." },
      { slug: "recipes", name: "Recipes", description: "How to cook and what to make." },
      { slug: "drinks", name: "Drinks", description: "Wine, spirits, coffee and beyond." },
      { slug: "industry", name: "Industry", description: "The business of food." },
    ],
  },
  {
    slug: "travel",
    name: "Travel",
    description:
      "Destinations, tips and the experience of moving through the world.",
    subcategories: [
      { slug: "destinations", name: "Destinations", description: "Where to go and what to see." },
      { slug: "tips", name: "Tips", description: "Smarter ways to travel." },
      { slug: "budget", name: "Budget", description: "Travel that does not break the bank." },
      { slug: "luxury", name: "Luxury", description: "The high end of travel." },
      { slug: "adventure", name: "Adventure", description: "Hiking, expeditions and the outdoors." },
    ],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    description:
      "Housing markets, deals and the places people call home.",
    subcategories: [
      { slug: "markets", name: "Markets", description: "Trends in residential and commercial real estate." },
      { slug: "homes", name: "Homes", description: "Tours, profiles and architectural stories." },
      { slug: "renting", name: "Renting", description: "Life as a tenant in a changing market." },
      { slug: "buying", name: "Buying", description: "How to buy in today's market." },
      { slug: "commercial", name: "Commercial", description: "Offices, retail and industrial property." },
    ],
  },
  {
    slug: "opinion",
    name: "Opinion",
    description:
      "Editorials, guest essays and analysis on the news of the day.",
    subcategories: [
      { slug: "editorials", name: "Editorials", description: "The view of Techno Times' editorial board." },
      { slug: "guest-essays", name: "Guest Essays", description: "Outside voices on the news." },
      { slug: "columnists", name: "Columnists", description: "Regular voices from our writers." },
      { slug: "letters", name: "Letters", description: "Readers respond." },
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
