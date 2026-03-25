import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/markets";
import { fetchKalshiMarketResultsForMarket } from "@/lib/kalshi";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheStore = new Map<
  string,
  {
    data: Awaited<ReturnType<typeof fetchKalshiMarketResultsForMarket>>;
    timestamp: number;
  }
>();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const market = getMarketById(marketId);

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
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
    console.error(`GET /api/markets/${marketId}/kalshi/results error:`, error);
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
