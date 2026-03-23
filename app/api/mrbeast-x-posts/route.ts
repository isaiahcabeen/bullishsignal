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

// Fallback Nitter instances tried in order if the primary one fails
const FALLBACK_NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.1d4.us",
];

// Browser-like request headers to avoid 403 blocks from Nitter instances
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  Accept: "application/rss+xml, application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

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

/**
 * Fetch the Nitter RSS feed for MrBeast with retry + exponential backoff.
 * Tries up to `maxRetries` times before throwing. Retries on 429 (rate-limit)
 * and transient network errors; propagates 403 immediately so we can fall back
 * to a different instance.
 */
async function fetchNitterRSS(
  rssUrl: string,
  maxRetries = 3,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1 s, 2 s, 4 s …
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 500),
      );
    }

    try {
      const response = await fetch(rssUrl, {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        return await response.text();
      }

      const errMsg = `Nitter RSS request failed: ${response.status} ${response.statusText}`;
      console.warn(`[mrbeast-x-posts] ${errMsg} (attempt ${attempt + 1}/${maxRetries}, url: ${rssUrl})`);

      // Don't retry on 403 – the instance is blocking us; try a different one
      if (response.status === 403) {
        throw new Error(errMsg);
      }

      lastError = new Error(errMsg);
    } catch (err) {
      // Re-throw 403 errors immediately (no point retrying same instance)
      if (err instanceof Error && err.message.includes("403")) throw err;
      lastError = err;
      console.warn(`[mrbeast-x-posts] Fetch error on attempt ${attempt + 1}/${maxRetries}:`, err);
    }
  }

  throw lastError;
}

async function fetchXSignals(): Promise<XSignals> {
  const primaryUrl =
    (process.env.NITTER_BASE_URL ?? DEFAULT_NITTER_BASE_URL).replace(/\/$/, "");

  // Build the ordered list of instances to try: primary first, then fallbacks
  const instances = [primaryUrl, ...FALLBACK_NITTER_INSTANCES];

  let xml: string | undefined;
  let lastError: unknown;

  for (const baseUrl of instances) {
    const rssUrl = `${baseUrl}/MrBeast/rss`;
    try {
      xml = await fetchNitterRSS(rssUrl);
      break; // success – stop trying further instances
    } catch (err) {
      console.warn(`[mrbeast-x-posts] Instance ${baseUrl} failed, trying next…`);
      lastError = err;
    }
  }

  if (xml === undefined) {
    throw lastError ?? new Error("All Nitter instances failed");
  }
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
