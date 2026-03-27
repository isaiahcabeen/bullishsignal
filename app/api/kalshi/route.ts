import { NextResponse } from "next/server";
import { getMarketById } from "@/lib/markets";
import {
  fetchKalshiWordPricesForMarket,
  fetchKalshiMarketMetadataForMarket,
} from "@/lib/kalshi";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheStore = new Map<
  string,
  {
    data: Awaited<ReturnType<typeof fetchKalshiWordPricesForMarket>>;
    metadata: Awaited<ReturnType<typeof fetchKalshiMarketMetadataForMarket>>;
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
    // Return cached data if still fresh
    const cached = cacheStore.get(marketId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        prices: cached.data,
        marketMetadata: cached.metadata,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        cached: true,
      });
    }

    const [prices, metadata] = await Promise.all([
      fetchKalshiWordPricesForMarket(market),
      fetchKalshiMarketMetadataForMarket(market),
    ]);

    cacheStore.set(marketId, { data: prices, metadata, timestamp: Date.now() });

    return NextResponse.json({
      prices,
      marketMetadata: metadata,
      lastUpdated: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    // Clear cache so the next request tries again instead of serving stale data
    cacheStore.delete(marketId);
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
