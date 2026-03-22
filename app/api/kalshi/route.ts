import { NextResponse } from "next/server";
import {
  fetchKalshiWordPrices,
  fetchKalshiMarketMetadata,
} from "@/lib/kalshi";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: {
  data: Awaited<ReturnType<typeof fetchKalshiWordPrices>>;
  metadata: Awaited<ReturnType<typeof fetchKalshiMarketMetadata>>;
  timestamp: number;
} | null = null;

export async function GET() {
  try {
    // Return cached data if still fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        prices: cache.data,
        marketMetadata: cache.metadata,
        lastUpdated: new Date(cache.timestamp).toISOString(),
        cached: true,
      });
    }

    const [prices, metadata] = await Promise.all([
      fetchKalshiWordPrices(),
      fetchKalshiMarketMetadata(),
    ]);

    cache = { data: prices, metadata, timestamp: Date.now() };

    return NextResponse.json({
      prices,
      marketMetadata: metadata,
      lastUpdated: new Date(cache.timestamp).toISOString(),
      cached: false,
    });
  } catch (error) {
    // Clear cache so the next request tries again instead of serving stale data
    cache = null;
    console.error("GET /api/kalshi error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Kalshi prices",
      },
      { status: 500 }
    );
  }
}
