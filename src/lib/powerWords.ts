// Curated news-appropriate power words. Optimized for editorial credibility
// rather than clickbait — these are the words that show up in real wire
// headlines because they actually compress meaning ("Quietly", "Suddenly")
// or carry weight ("Defining", "Sweeping").
//
// The writer agent must use exactly one of these in every article's title,
// and the slug must include the article's focus keyword.
export const POWER_WORDS: readonly string[] = [
  "Inside", "Why", "How", "Quietly", "Suddenly", "Just", "Now", "First",
  "Last", "New", "Breaking", "Major", "Latest", "Rare", "Defining",
  "Pivotal", "Critical", "Crucial", "Decisive", "Sweeping", "Stunning",
  "Sharp", "Bold", "Hidden", "Unfolding", "Surprising", "Strategic",
  "Urgent", "Quiet", "Final", "Renewed",
];

const NORMALIZED = new Set(POWER_WORDS.map((w) => w.toLowerCase()));

// Returns the first power word found in a title, case-insensitive.
export function detectPowerWord(title: string): string | null {
  for (const word of title.split(/\s+/)) {
    const cleaned = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (NORMALIZED.has(cleaned)) {
      return POWER_WORDS.find((w) => w.toLowerCase() === cleaned) ?? null;
    }
  }
  return null;
}
