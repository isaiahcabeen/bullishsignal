/**
 * A word entry for a market.
 * - `label`   – the canonical display name shown in the UI
 * - `aliases` – additional phrases that all map to this same contract
 *               (used when matching Kalshi market titles)
 */
export interface WordEntry {
  label: string;
  aliases?: string[];
}

export interface MarketConfig {
  id: string;
  title: string;
  description: string;
  /** Ordered list of trackable words / phrases for this market. */
  words: WordEntry[];
  /** Lowercase substrings used to identify this market's contracts on Kalshi. */
  kalshiKeywords: string[];
  /** Filename (relative to app/data/) for historical transcript data. */
  dataFile: string;
  imageUrl?: string;
  emoji?: string;
}

/**
 * Returns every string (label + aliases) that should be matched for a word entry.
 */
export function wordMatchStrings(entry: WordEntry): string[] {
  return [entry.label, ...(entry.aliases ?? [])];
}

/**
 * Returns the canonical label for a given match string across all entries.
 */
export function resolveWordLabel(
  entries: WordEntry[],
  matchStr: string
): string | null {
  const lower = matchStr.toLowerCase();
  for (const entry of entries) {
    if (wordMatchStrings(entry).some((s) => s.toLowerCase() === lower)) {
      return entry.label;
    }
  }
  return null;
}

export const MARKETS: MarketConfig[] = [
  {
    id: "mrbeast",
    title: "MrBeast Mention Assistant",
    description:
      "Track words MrBeast uses across his YouTube videos and trade on Kalshi prediction markets.",
    words: [
      { label: "Time" },
      { label: "Million" },
      { label: "Challenge" },
      { label: "Money" },
      { label: "Win" },
      { label: "Feastable" },
      { label: "Beast" },
      { label: "Water" },
      { label: "Contestant" },
      { label: "Insane" },
      { label: "Prize" },
      { label: "Car" },
      { label: "Billion" },
      { label: "Subscribe" },
      { label: "Saudi Arabia" },
    ],
    kalshiKeywords: ["mrbeast", "mr beast"],
    dataFile: "mrbeast.json",
    imageUrl:
      "https://github.com/user-attachments/assets/e2ad1291-8065-4357-911a-ba0a41ea5668",
    emoji: "🎬",
  },
  {
    id: "trump",
    title: "What will Trump say this week?",
    description:
      "Predict which phrases Trump will say at press conferences and public appearances this week.",
    words: [
      { label: "Melania" },
      { label: "Autopen", aliases: ["Auto Pen"] },
      { label: "Rigged Election", aliases: ["Stolen Election"] },
      { label: "Bibi", aliases: ["Netanyahu"] },
      { label: "Windmill" },
      { label: "Drill Baby Drill" },
      { label: "TDS", aliases: ["Trump Derangement Syndrome"] },
      { label: "Predict", aliases: ["Prediction"] },
      { label: "Communist", aliases: ["Communism"] },
      { label: "Stupid Question" },
      { label: "Crypto", aliases: ["Bitcoin"] },
      { label: "Epstein" },
      { label: "Golden Dome" },
      { label: "Nobel" },
      { label: "Autism" },
      { label: "Marijuana", aliases: ["Weed", "Cannabis"] },
      { label: "Discombobulator" },
      { label: "Mog", aliases: ["Mogged", "Mogging"] },
      { label: "50,000" },
      { label: "Barack Hussein Obama" },
      { label: "Eight War" },
      { label: "Hottest" },
      { label: "Newscum" },
      { label: "Sleepy Joe" },
      { label: "Thug" },
      { label: "Transgender" },
      { label: "Who are you with", aliases: ["Where are you from"] },
    ],
    kalshiKeywords: ["trump"],
    dataFile: "trump.json",
    emoji: "🇺🇸",
  },
];

export function getMarketById(id: string): MarketConfig | undefined {
  return MARKETS.find((m) => m.id === id);
}
