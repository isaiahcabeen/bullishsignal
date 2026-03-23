"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

type VideoTypeResult = {
  type: string;
  probability: number;
  recentProbability: number;
  combinedProbability: number;
  count: number;
  recentCount: number;
  description: string;
  examples: string[];
  emoji: string;
  videosSinceLastType: number;
  avgSpacing: number;
};

type VideoTypePrediction = {
  types: VideoTypeResult[];
  totalVideos: number;
  recentWindow: number;
  lastVideoType: string;
  patternNote: string;
  xSignals?: {
    topType: string | null;
    typeCounts: Record<string, number>;
    postCount: number;
  };
};

type XPost = {
  id: string;
  text: string;
  createdAt: string;
  detectedKeywords: string[];
  matchedTypes: string[];
};

type XSignalsData = {
  posts: XPost[];
  typeCounts: Record<string, number>;
  topType: string | null;
  cachedAt: string;
};

function ProbabilityBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  Competition: "bg-gradient-to-r from-green-500 to-emerald-600",
  Endurance: "bg-gradient-to-r from-orange-500 to-red-500",
  Comparison: "bg-gradient-to-r from-purple-500 to-violet-600",
  Exploration: "bg-gradient-to-r from-sky-500 to-blue-600",
  Philanthropy: "bg-gradient-to-r from-pink-500 to-rose-500",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  Competition: "bg-green-100 text-green-700",
  Endurance: "bg-orange-100 text-orange-700",
  Comparison: "bg-purple-100 text-purple-700",
  Exploration: "bg-sky-100 text-sky-700",
  Philanthropy: "bg-pink-100 text-pink-700",
};

export default function VideoTypePage() {
  const [data, setData] = useState<VideoTypePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xSignals, setXSignals] = useState<XSignalsData | null>(null);
  const [xLoading, setXLoading] = useState(true);
  const [xError, setXError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/video-type");
        if (!res.ok) throw new Error("Failed to load data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    async function loadXSignals() {
      try {
        const res = await fetch("/api/mrbeast-x-posts");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load X signals");
        }
        const json = await res.json();
        setXSignals(json);
      } catch (err) {
        setXError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setXLoading(false);
      }
    }

    loadData();
    loadXSignals();
  }, []);

  const top = data?.types[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center relative">

            {/* Left Side */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Home"
              >
                <Home className="w-6 h-6" />
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                MrBeast Trading Assistant
              </h1>
            </div>

            {/* Centered Logo */}
            <img
              src={BULLISH_SIGNALS_LOGO_URL}
              alt="Bullish Signals"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: "97px", height: "56px" }}
            />

            {/* Right Side */}
            <nav className="flex gap-6 items-center">
              <span className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-0.5 cursor-default">
                Video Type
              </span>
              <Link
                href="/mrbeast/predict"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Analyze Prices
              </Link>
            </nav>

          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="border-b border-gray-100 px-4 pt-10 pb-8 text-center bg-white">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 pb-2">
          Video Type Prediction
        </h1>
        <p className="text-gray-500 text-lg mt-3 max-w-2xl mx-auto">
          Based on historical data, here&apos;s the predicted probability for each
          MrBeast video type in the next upload.
        </p>
        {data && (
          <p className="text-gray-400 text-sm mt-3">
            Analyzed {data.totalVideos} videos · Recent window: last {data.recentWindow} videos
          </p>
        )}
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-1">⚠️ Failed to load predictions</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-8">

            {/* Top Prediction Banner */}
            {top && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 flex items-center gap-5">
                <span className="text-5xl">{top.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                    Most Likely Next Video Type
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {top.type}
                    <span className={`ml-3 text-base font-semibold px-3 py-1 rounded-full ${TYPE_BADGE_COLORS[top.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {(top.combinedProbability * 100).toFixed(1)}%
                    </span>
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">{data.patternNote}</p>
                </div>
              </div>
            )}

            {/* Type Cards */}
            <div className="space-y-6">
              {data.types.map((t, i) => (
                <div
                  key={t.type}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all duration-200"
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{t.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-900">{t.type}</h3>
                          {i === 0 && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Most Likely
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">{t.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-3xl font-bold text-gray-900">
                        {(t.combinedProbability * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">predicted probability</p>
                    </div>
                  </div>

                  {/* Combined Probability Bar */}
                  <div className="mb-5">
                    <ProbabilityBar
                      value={t.combinedProbability}
                      color={TYPE_COLORS[t.type] ?? "bg-gray-400"}
                    />
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">All-time Frequency</p>
                      <p className="text-lg font-bold text-gray-800">
                        {(t.probability * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">{t.count} videos</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Recent Trend</p>
                      <p className="text-lg font-bold text-gray-800">
                        {(t.recentProbability * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">{t.recentCount} of last {data.recentWindow}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Spacing Status</p>
                      <p className="text-lg font-bold text-gray-800">
                        {t.videosSinceLastType === 0
                          ? "Just aired"
                          : `${t.videosSinceLastType} videos ago`}
                      </p>
                      <p className="text-xs text-gray-400">avg every {t.avgSpacing} videos</p>
                    </div>
                  </div>

                  {/* Examples */}
                  {t.examples.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Example Videos
                      </p>
                      <ul className="space-y-1">
                        {t.examples.map((ex) => (
                          <li key={ex} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Methodology Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-1">📊 How probabilities are calculated</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                The predicted probability blends four signals: <strong>30% all-time historical frequency</strong>{" "}
                (how often each type has appeared across all tracked videos),{" "}
                <strong>30% recent trend</strong> (frequency within the last {data.recentWindow} videos),{" "}
                <strong>20% spacing adjustment</strong> (how many videos have aired since the type last appeared
                relative to its historical average — types that are &quot;overdue&quot; get a boost while recently aired
                types cool down), and <strong>20% Markov transitions</strong> (what types have historically followed
                {/^[aeiou]/i.test(data.lastVideoType) ? " an" : " a"} <em>{data.lastVideoType}</em> video).
                Combined probabilities are normalized so they sum to 100%.
              </p>
            </div>

          </div>
        )}

        {/* 🔴 Live X Signals — loads independently */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <h2 className="text-lg font-bold text-gray-900">Live X Signals</h2>
            <span className="text-xs text-gray-400">from @MrBeast</span>
          </div>

          {xLoading && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex items-center gap-3 text-gray-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-400" />
              Fetching latest X posts…
            </div>
          )}

          {!xLoading && xError && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
              <p className="font-semibold text-gray-500 mb-1">X signals unavailable</p>
              <p>{xError}</p>
            </div>
          )}

          {!xLoading && xSignals && (
            <div className="space-y-4">

              {/* Summary bar */}
              {xSignals.topType && (
                <div className="bg-gray-900 text-white rounded-2xl p-5 flex items-center gap-4">
                  <span className="text-3xl">𝕏</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                      Strongest X Signal
                    </p>
                    <p className="text-xl font-bold">
                      {xSignals.topType}
                      {Object.keys(xSignals.typeCounts).length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          ({xSignals.typeCounts[xSignals.topType]} mention{xSignals.typeCounts[xSignals.topType] !== 1 ? "s" : ""} across {xSignals.posts.length} posts)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Post list */}
              {xSignals.posts.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
                  No recent X posts found for @MrBeast.
                </div>
              ) : (
                <div className="space-y-3">
                  {xSignals.posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow"
                    >
                      <p className="text-gray-800 text-sm leading-relaxed mb-3">
                        {post.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {post.detectedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full"
                          >
                            {kw}
                          </span>
                        ))}
                        {post.matchedTypes.map((type) => (
                          <span
                            key={type}
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE_COLORS[type] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {type}
                          </span>
                        ))}
                        {post.detectedKeywords.length === 0 && (
                          <span className="text-xs text-gray-400">No keywords detected</span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 text-right">
                Cached at {new Date(xSignals.cachedAt).toLocaleTimeString()} · refreshes every hour
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
