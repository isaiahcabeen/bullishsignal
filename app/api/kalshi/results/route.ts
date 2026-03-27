import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/markets";
import { fetchKalshiMarketResultsForMarket } from "@/lib/kalshi";

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (results change less frequently)
const cacheStore = new Map<
  string,
  {
    data: Awaited<ReturnType<typeof fetchKalshiMarketResultsForMarket>>;
    timestamp: number;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId") ?? "mrbeast";

  const market = getMarketById(marketId);
  if (!market) {
    return NextResponse.json(
      { error: `Market "${marketId}" not found` },
      { status: 404 }
    );
  }

  try {
    const cached = cacheStore.get(marketId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        results: cached.data,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        cached: true,
      });
    }

    const results = await fetchKalshiMarketResultsForMarket(market);
    cacheStore.set(marketId, { data: results, timestamp: Date.now() });

    return NextResponse.json({
      results,
      lastUpdated: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    cacheStore.delete(marketId);
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
