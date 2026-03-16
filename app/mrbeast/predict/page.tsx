"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getRiskColor } from "@/lib/probability";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

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

export default function PredictPage() {
  const router = useRouter();
  const [kalshiPrices, setKalshiPrices] = useState<KalshiWordPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingKalshi, setLoadingKalshi] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [kalshiError, setKalshiError] = useState<string | null>(null);

  const calculateRecommendations = useCallback(
    async (prices: KalshiWordPrice[]) => {
      if (prices.length === 0) return;

      const priceMap: Record<string, number> = {};
      prices.forEach(({ word, price }) => {
        priceMap[word] = price;
      });

      setLoadingRecs(true);
      try {
        const res = await fetch("/api/ev", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: priceMap,
            wordsToAnalyze: Object.keys(priceMap),
          }),
        });

        const data = await res.json();
        setRecommendations(data);
      } catch (err) {
        console.error("Failed to calculate recommendations", err);
      } finally {
        setLoadingRecs(false);
      }
    },
    []
  );

  const loadKalshiData = useCallback(async () => {
    setLoadingKalshi(true);
    setKalshiError(null);

    try {
      const res = await fetch("/api/kalshi");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to fetch Kalshi data");
      }

      const prices: KalshiWordPrice[] = data.prices ?? [];
      setKalshiPrices(prices);
      setLastUpdated(data.lastUpdated ?? null);

      // Auto-calculate recommendations once prices are loaded
      await calculateRecommendations(prices);
    } catch (err) {
      console.error("Failed to load Kalshi prices", err);
      setKalshiError(
        err instanceof Error ? err.message : "Failed to fetch Kalshi prices"
      );
    } finally {
      setLoadingKalshi(false);
    }
  }, [calculateRecommendations]);

  // Fetch Kalshi data on page load
  useEffect(() => {
    loadKalshiData();
  }, [loadKalshiData]);

  const buyRecommendations = recommendations.filter((r) => r.action === "BUY");
  const waitRecommendations = recommendations.filter(
    (r) => r.action === "WAIT"
  );

  const isLoading = loadingKalshi || loadingRecs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Logo */}
      <div className="flex justify-center items-center py-4 mb-2">
        <img
          src={BULLISH_SIGNALS_LOGO_URL}
          alt="Bullish Signals"
          className="h-20 w-auto"
        />
      </div>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/mrbeast")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white">Price Analysis</h1>
          <button
            onClick={loadKalshiData}
            disabled={isLoading}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Kalshi data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Live Data Banner */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isLoading
                  ? "bg-yellow-400 animate-pulse"
                  : kalshiError
                  ? "bg-red-400"
                  : "bg-green-400"
              }`}
            />
            <span className="text-sm text-gray-300">
              {loadingKalshi
                ? "Fetching live prices from Kalshi…"
                : loadingRecs
                ? "Calculating recommendations…"
                : kalshiError
                ? "Could not connect to Kalshi"
                : `Live Kalshi data · ${kalshiPrices.length} markets loaded`}
            </span>
          </div>
          {lastUpdated && !loadingKalshi && (
            <span className="text-xs text-gray-500">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Error State */}
        {kalshiError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 mb-6 text-center">
            <p className="text-red-400 font-medium mb-2">
              ⚠️ Failed to load Kalshi data
            </p>
            <p className="text-sm text-gray-400 mb-4">{kalshiError}</p>
            <button
              onClick={loadKalshiData}
              className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded text-red-300 text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loadingKalshi && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 animate-pulse">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 h-20"
              />
            ))}
          </div>
        )}

        {/* Word Price Grid */}
        {!loadingKalshi && kalshiPrices.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Current Kalshi Prices
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {kalshiPrices.map(({ word, price, ticker }) => (
                <div
                  key={word}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center"
                  title={ticker}
                >
                  <p className="text-sm font-medium text-gray-300 mb-1 truncate">
                    {word}
                  </p>
                  <p className="text-xl font-bold text-green-400">
                    {(price * 100).toFixed(0)}¢
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No markets found */}
        {!loadingKalshi && !kalshiError && kalshiPrices.length === 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 text-center">
            <p className="text-gray-300 font-medium mb-1">
              No MrBeast markets on Kalshi yet
            </p>
            <p className="text-sm text-gray-500">
              Markets will appear here once Kalshi opens betting for the next
              MrBeast video. Check back closer to the drop!
            </p>
          </div>
        )}

        {/* Results */}
        {recommendations.length > 0 && (
          <>
            {/* BUY Recommendations */}
            {buyRecommendations.length > 0 && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-green-400 mb-4">
                  🟢 BUY ({buyRecommendations.length})
                </h3>
                <div className="space-y-4">
                  {buyRecommendations.map((rec) => (
                    <RecommendationCard key={rec.word} rec={rec} />
                  ))}
                </div>
              </div>
            )}

            {/* WAIT Recommendations */}
            {waitRecommendations.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-yellow-400 mb-4">
                  🟡 WAIT ({waitRecommendations.length})
                </h3>
                <div className="space-y-4">
                  {waitRecommendations.map((rec) => (
                    <RecommendationCard key={rec.word} rec={rec} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading recs overlay */}
        {loadingRecs && kalshiPrices.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Calculating recommendations…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-lg font-bold text-white">{rec.word}</h4>
        <div className="text-right">
          <p className="text-sm text-gray-400">Expected Value</p>
          <p
            className={`text-lg font-bold ${
              rec.expectedValue > 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {rec.expectedValue > 0 ? "+" : ""}
            {(rec.expectedValue * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-gray-400">Probability</p>
          <p className="font-semibold text-blue-400">
            {(rec.probability * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-gray-400">Price</p>
          <p className="font-semibold text-purple-400">
            {(rec.marketPrice * 100).toFixed(0)}¢
          </p>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-gray-400">Confidence</p>
          <p className="font-semibold text-cyan-400">
            {(rec.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-gray-400">Max Profit</p>
          <p className="font-semibold text-green-400">
            {(rec.profitPotential * 100).toFixed(0)}¢
          </p>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <p className="text-gray-400">Risk Level</p>
          <p className={`font-semibold ${getRiskColor(rec.riskLevel)}`}>
            {rec.riskLevel}
          </p>
        </div>
      </div>
    </div>
  );
}