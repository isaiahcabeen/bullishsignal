import { NextResponse } from "next/server";

// Keyword → video type mapping
const KEYWORD_MAP: Record<string, string[]> = {
  Competition: ["challenge", "compete", "vs", "battle", "tournament", "win"],
  Endurance: ["survive", "hours", "extreme", "test", "limit", "staying"],
  Comparison: ["$1", "$500k", "cheap", "expensive", "budget"],
  Exploration: ["visiting", "temple", "pyramid", "location", "place", "exploring"],
  Philanthropy: ["donate", "charity", "feeding", "helping", "give", "donation"],
};

export type XPost = {
  id: string;
  text: string;
  createdAt: string;
  detectedKeywords: string[];
  matchedTypes: string[];
};

export type XSignals = {
  posts: XPost[];
  typeCounts: Record<string, number>;
  topType: string | null;
  cachedAt: string;
};

// Default Nitter instance to use when NITTER_BASE_URL is not set
const DEFAULT_NITTER_BASE_URL = "https://nitter.poast.org";
const USER_AGENT = "bullishsignal/1.0";

// Simple in-memory cache (1 hour TTL)
const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { data: XSignals; timestamp: number } | null = null;
// In-flight guard: prevents multiple concurrent requests from all hitting Nitter
let inflightPromise: Promise<XSignals> | null = null;

/** Escape all special regex metacharacters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectKeywords(text: string): { keywords: string[]; types: string[] } {
  const keywords: string[] = [];
  const types = new Set<string>();

  for (const [type, words] of Object.entries(KEYWORD_MAP)) {
    for (const word of words) {
      // Match whole-word occurrences, handling $ and other special chars safely
      const escaped = escapeRegex(word);
      const regex = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "i");
      if (regex.test(text)) {
        keywords.push(word);
        types.add(type);
      }
    }
  }

  return { keywords: [...new Set(keywords)], types: [...types] };
}

/**
 * Parse tweet items from a Nitter RSS feed XML string.
 * Uses regex-based parsing which is sufficient for the well-structured Nitter RSS format.
 * Items where the tweet ID cannot be extracted from the link are silently skipped.
 */
function parseNitterRSS(xml: string): Array<{ id: string; text: string; createdAt: string }> {
  const results: Array<{ id: string; text: string; createdAt: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    // Extract title (may be CDATA-wrapped)
    const titleMatch =
      /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(item) ||
      /<title>([\s\S]*?)<\/title>/i.exec(item);
    // Extract link
    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(item);
    // Extract publication date
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(item);

    if (!titleMatch || !linkMatch) continue;

    const text = titleMatch[1].trim();
    const link = linkMatch[1].trim();

    // Skip replies (start with "R to @") and retweets (start with "RT by @")
    if (/^R to @/i.test(text) || /^RT by @/i.test(text)) continue;

    // Extract tweet ID from the URL path (/status/<id>); skip if not found
    const idMatch = /\/status\/(\d+)/.exec(link);
    if (!idMatch) continue;
    const id = idMatch[1];

    const createdAt = pubDateMatch
      ? new Date(pubDateMatch[1].trim()).toISOString()
      : new Date().toISOString();

    results.push({ id, text, createdAt });
  }

  return results;
}

async function fetchXSignals(): Promise<XSignals> {
  const nitterBaseUrl =
    (process.env.NITTER_BASE_URL ?? DEFAULT_NITTER_BASE_URL).replace(/\/$/, "");

  const rssUrl = `${nitterBaseUrl}/MrBeast/rss`;

  const response = await fetch(rssUrl, {
    headers: { "User-Agent": USER_AGENT },
    // 10-second timeout using AbortSignal
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Nitter RSS request failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const rawPosts = parseNitterRSS(xml).slice(0, 10);

  const posts: XPost[] = [];
  const typeCounts: Record<string, number> = {};

  for (const raw of rawPosts) {
    const { keywords, types } = detectKeywords(raw.text);
    posts.push({
      id: raw.id,
      text: raw.text,
      createdAt: raw.createdAt,
      detectedKeywords: keywords,
      matchedTypes: types,
    });

    for (const type of types) {
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
  }

  const topType =
    Object.keys(typeCounts).length > 0
      ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  return {
    posts,
    typeCounts,
    topType,
    cachedAt: new Date().toISOString(),
  };
}

export async function GET() {
  // Return cached data if still fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  // If a fetch is already in flight, wait for it instead of making a second request
  if (!inflightPromise) {
    inflightPromise = fetchXSignals()
      .then((result) => {
        cache = { data: result, timestamp: Date.now() };
        return result;
      })
      .finally(() => {
        inflightPromise = null;
      });
  }

  try {
    const result = await inflightPromise;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch X posts via Nitter", error);
    return NextResponse.json(
      { error: "Failed to fetch X posts" },
      { status: 500 }
    );
  }
}
