"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import { ArrowLeft, RefreshCw, Clock } from "lucide-react";
import { getRiskColor } from "@/lib/probability";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";
import { MARKETS } from "@/lib/markets";

type Recommendation = {
  word: string;
  probability: number;
  confidence: number;
  marketPrice: number;
  expectedValue: number;
  action: "BUY" | "WAIT";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  profitPotential: number;
  lossRisk: number;
};

type KalshiWordPrice = {
  word: string;
  ticker: string;
  title: string;
  price: number;
};

type MarketResult = {
  ticker: string;
  title: string;
  status: string;
  open_time?: string;
  close_time?: string;
  result?: string;
};

export default function MarketPredictPage() {
  const router = useRouter();
  const { marketId } = useParams<{ marketId: string }>();
  const market = useMemo(
    () => MARKETS.find((m) => m.id === marketId),
    [marketId]
  );

  const [kalshiPrices, setKalshiPrices] = useState<KalshiWordPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingKalshi, setLoadingKalshi] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [kalshiError, setKalshiError] = useState<string | null>(null);
  const [marketResults, setMarketResults] = useState<MarketResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const calculateRecommendations = useCallback(
    async (prices: KalshiWordPrice[]) => {
      if (prices.length === 0) return;

      const priceMap: Record<string, number> = {};
      prices.forEach(({ word, price }) => {
        priceMap[word] = price;
      });

      setLoadingRecs(true);
      try {
        const res = await fetch(`/api/markets/${marketId}/ev`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: priceMap,
            wordsToAnalyze: Object.keys(priceMap),
          }),
        });

        const data = await res.json();
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to calculate recommendations", err);
      } finally {
        setLoadingRecs(false);
      }
    },
    [marketId]
  );

  const loadKalshiData = useCallback(async () => {
    setLoadingKalshi(true);
    setKalshiError(null);

    try {
      const res = await fetch(`/api/markets/${marketId}/kalshi`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to fetch Kalshi data");
      }

      const prices: KalshiWordPrice[] = data.prices ?? [];
      setKalshiPrices(prices);
      setLastUpdated(data.lastUpdated ?? null);

      await calculateRecommendations(prices);
    } catch (err) {
      console.error("Failed to load Kalshi prices", err);
      setKalshiError(
        err instanceof Error ? err.message : "Failed to fetch Kalshi prices"
      );
    } finally {
      setLoadingKalshi(false);
    }
  }, [marketId, calculateRecommendations]);

  const loadMarketResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/markets/${marketId}/kalshi/results`);
      const data = await res.json();
      if (res.ok) {
        setMarketResults(data.results ?? []);
      }
    } catch (err) {
      console.error("Failed to load market results", err);
    } finally {
      setLoadingResults(false);
    }
  }, [marketId]);

  useEffect(() => {
    if (!market) return;
    loadKalshiData();
    loadMarketResults();
  }, [market, loadKalshiData, loadMarketResults]);

  if (!market) {
    notFound();
  }

  const buyRecommendations = recommendations.filter((r) => r.action === "BUY");
  const waitRecommendations = recommendations.filter((r) => r.action === "WAIT");
  const isLoading = loadingKalshi || loadingRecs;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center relative">

            {/* Left Side */}
            <button
              onClick={() => router.push(`/markets/${marketId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>

            {/* Centered Logo */}
            <img
              src={BULLISH_SIGNALS_LOGO_URL}
              alt="Bullish Signals"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: "97px", height: "56px" }}
            />

            {/* Right Side */}
            <button
              onClick={loadKalshiData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-60"
              title="Refresh Kalshi data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="border-b border-gray-100 px-4 pt-10 pb-8 text-center bg-white">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 pb-2">
          Price Analysis
        </h1>
        <p className="text-gray-500 text-lg mt-3 max-w-2xl mx-auto">
          {market.emoji} {market.title}
        </p>

        {/* Live status pill */}
        <div className="flex justify-center mt-5">
          <div
            className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-5 py-2"
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isLoading
                  ? "bg-yellow-400 animate-pulse"
                  : kalshiError
                  ? "bg-red-400"
                  : kalshiPrices.length === 0
                  ? "bg-gray-400"
                  : "bg-green-400"
              }`}
            />
            <span className="text-gray-600 text-sm font-medium">
              {loadingKalshi
                ? "Fetching live prices from Kalshi…"
                : loadingRecs
                ? "Calculating recommendations…"
                : kalshiError
                ? "Could not connect to Kalshi"
                : kalshiPrices.length === 0
                ? "Waiting for market to open"
                : lastUpdated
                ? `Live · Updated ${new Date(lastUpdated).toLocaleTimeString("en-US", { timeZone: "America/Chicago" })}`
                : "Live Kalshi Data"}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Summary Stats */}
        {!isLoading && !kalshiError && kalshiPrices.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-gray-900">{kalshiPrices.length}</div>
              <div className="text-sm text-gray-500 mt-1 font-medium">Markets Tracked</div>
            </div>
            <div className="bg-white border border-green-200 rounded-2xl shadow-sm p-5 text-center hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-green-600">{buyRecommendations.length}</div>
              <div className="text-sm text-gray-500 mt-1 font-medium">BUY Signals</div>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-5 text-center hover:shadow-md transition-all duration-200">
              <div className="text-3xl font-bold text-amber-500">{waitRecommendations.length}</div>
              <div className="text-sm text-gray-500 mt-1 font-medium">WAIT Signals</div>
            </div>
          </div>
        )}

        {/* Error State */}
        {kalshiError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center shadow-sm">
            <p className="text-red-600 font-semibold mb-2">⚠️ Failed to load Kalshi data</p>
            <p className="text-sm text-gray-500 mb-4">{kalshiError}</p>
            <button
              onClick={loadKalshiData}
              className="px-5 py-2 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg text-red-600 text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loadingKalshi && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 animate-pulse">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="bg-gray-100 border border-gray-200 rounded-2xl p-4 h-20" />
            ))}
          </div>
        )}

        {/* Word Price Grid */}
        {!loadingKalshi && kalshiPrices.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Kalshi Prices</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {kalshiPrices.map(({ word, price, ticker }) => (
                <div
                  key={word}
                  className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm hover:border-green-400 hover:shadow-md transition-all duration-200"
                  title={ticker}
                >
                  <p className="text-sm font-semibold text-gray-600 mb-1 truncate">{word}</p>
                  <p className="text-2xl font-bold text-green-500">
                    {(price * 100).toFixed(0)}¢
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No markets found */}
        {!loadingKalshi && !kalshiError && kalshiPrices.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 mb-6 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-sky-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No active markets yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              Kalshi hasn&apos;t opened betting for this market yet.
              Check back once the market goes live — analysis will appear here automatically.
            </p>
            <button
              onClick={() => router.push(`/markets/${marketId}`)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-6">
            {buyRecommendations.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  🟢 BUY Recommendations
                  <span className="ml-3 text-base font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {buyRecommendations.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {buyRecommendations.map((rec) => (
                    <RecommendationCard key={rec.word} rec={rec} />
                  ))}
                </div>
              </section>
            )}

            {waitRecommendations.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  🟡 WAIT Recommendations
                  <span className="ml-3 text-base font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                    {waitRecommendations.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {waitRecommendations.map((rec) => (
                    <RecommendationCard key={rec.word} rec={rec} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Loading recs */}
        {loadingRecs && kalshiPrices.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Calculating recommendations…</p>
            <p className="text-gray-400 text-sm mt-1">Analyzing market prices against historical data</p>
          </div>
        )}

        {/* Market Results Section */}
        {(marketResults.length > 0 || loadingResults) && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Past Market Results</h2>

            {loadingResults ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-2xl h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketResults.map((result) => (
                  <MarketResultCard key={result.ticker} result={result} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const isPositiveEV = rec.expectedValue > 0;
  const borderAccent =
    rec.action === "BUY" ? "border-l-green-400" : "border-l-amber-400";

  return (
    <div
      className={`group bg-white border border-gray-200 border-l-4 ${borderAccent} rounded-2xl p-6 hover:shadow-lg hover:shadow-green-500/10 hover:border-gray-300 transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-xl font-bold text-gray-900 leading-tight">{rec.word}</h4>
          <span
            aria-label={rec.action === "BUY" ? "Recommendation: BUY" : "Recommendation: WAIT"}
            className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              rec.action === "BUY"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {rec.action}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">Expected Value</p>
          <p className={`text-xl font-bold ${isPositiveEV ? "text-green-500" : "text-red-500"}`}>
            {isPositiveEV ? "+" : ""}
            {(rec.expectedValue * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 font-medium">Model Probability</span>
          <span className="text-xs font-bold text-blue-600">
            {(rec.probability * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
            style={{ width: `${rec.probability * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Price</p>
          <p className="text-sm font-bold text-purple-600">
            {(rec.marketPrice * 100).toFixed(0)}¢
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Confidence</p>
          <p className="text-sm font-bold text-cyan-600">
            {(rec.confidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Max Profit</p>
          <p className="text-sm font-bold text-green-600">
            {(rec.profitPotential * 100).toFixed(0)}¢
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Risk</p>
          <p className={`text-sm font-bold ${getRiskColor(rec.riskLevel)}`}>
            {rec.riskLevel}
          </p>
        </div>
      </div>
    </div>
  );
}

function MarketResultCard({ result }: { result: MarketResult }) {
  const resolved = result.result?.toUpperCase();
  const isYes = resolved === "YES";
  const isNo = resolved === "NO";

  const closedAt = result.close_time
    ? new Date(result.close_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Chicago",
      })
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug truncate">
            {result.title}
          </p>
          {closedAt && (
            <p className="text-xs text-gray-400 mt-0.5">Closed {closedAt}</p>
          )}
        </div>

        {resolved ? (
          <span
            className={`flex-shrink-0 inline-block text-sm font-bold px-3 py-1 rounded-full ${
              isYes
                ? "bg-green-100 text-green-700"
                : isNo
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isYes ? "✅ YES" : isNo ? "❌ NO" : resolved}
          </span>
        ) : (
          <span className="flex-shrink-0 inline-block text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-500">
            Pending
          </span>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Ticker:</span>{" "}
        <span className="font-mono">{result.ticker}</span>
      </div>
    </div>
  );
}
