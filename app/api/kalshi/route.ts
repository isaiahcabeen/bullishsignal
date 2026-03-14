import { NextResponse } from "next/server";
import { fetchKalshiWordPrices } from "@/lib/kalshi";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: { data: Awaited<ReturnType<typeof fetchKalshiWordPrices>>; timestamp: number } | null = null;

export async function GET() {
  try {
    // Return cached data if still fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        prices: cache.data,
        lastUpdated: new Date(cache.timestamp).toISOString(),
        cached: true,
      });
    }

    const prices = await fetchKalshiWordPrices();

    cache = { data: prices, timestamp: Date.now() };

    return NextResponse.json({
      prices,
      lastUpdated: new Date(cache.timestamp).toISOString(),
      cached: false,
    });
  } catch (error) {
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
