import { NextResponse } from "next/server";
import { fetchKalshiMarketResults } from "@/lib/kalshi";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: {
  data: Awaited<ReturnType<typeof fetchKalshiMarketResults>>;
  timestamp: number;
} | null = null;

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        results: cache.data,
        lastUpdated: new Date(cache.timestamp).toISOString(),
        cached: true,
      });
    }

    const results = await fetchKalshiMarketResults();
    cache = { data: results, timestamp: Date.now() };

    return NextResponse.json({
      results,
      lastUpdated: new Date(cache.timestamp).toISOString(),
      cached: false,
    });
  } catch (error) {
    cache = null;
    console.error("GET /api/kalshi/results error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Kalshi results",
      },
      { status: 500 }
    );
  }
}
