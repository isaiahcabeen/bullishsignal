import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

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

// Simple in-memory cache (1 hour TTL)
const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { data: XSignals; timestamp: number } | null = null;
// In-flight guard: prevents multiple concurrent requests from all hitting the X API
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

async function fetchXSignals(): Promise<XSignals> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error("X API credentials not configured");
  }

  const client = new TwitterApi(bearerToken);
  const roClient = client.readOnly;

  const userLookup = await roClient.v2.userByUsername("MrBeast", {
    "user.fields": ["id"],
  });

  if (!userLookup.data) {
    throw new Error("Could not find @MrBeast on X");
  }

  const userId = userLookup.data.id;

  const timeline = await roClient.v2.userTimeline(userId, {
    max_results: 10,
    "tweet.fields": ["created_at", "text"],
    exclude: ["replies", "retweets"],
  });

  const posts: XPost[] = [];
  const typeCounts: Record<string, number> = {};

  for (const tweet of timeline.data.data ?? []) {
    const { keywords, types } = detectKeywords(tweet.text);
    posts.push({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at ?? new Date().toISOString(),
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
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    return NextResponse.json(
      { error: "X API credentials not configured" },
      { status: 503 }
    );
  }

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
    console.error("Failed to fetch X posts", error);
    return NextResponse.json(
      { error: "Failed to fetch X posts" },
      { status: 500 }
    );
  }
}
