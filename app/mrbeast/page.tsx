"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, TrendingUp } from "lucide-react";
import { getConfidenceInterpretation } from "@/lib/probability";

type WordStats = {
  word: string;
  probability: number;
  confidence: number;
  metrics: {
    frequency: number;
    consistency: number;
    entropy: number;
    recentBias: number;
    effectiveSampleSize: number;
  };
  appearanceRate: number;
};

export default function MrBeastHome() {
  const [stats, setStats] = useState<WordStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/ev");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredStats = stats.filter((s) =>
    s.word.toLowerCase().includes(filter.toLowerCase())
  );

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return "from-green-500 to-emerald-600";
    if (probability <= 0.3) return "from-red-500 to-rose-600";
    return "from-amber-500 to-yellow-600";
  };

  const getProbabilityBgColor = (probability: number) => {
    if (probability >= 0.7) return "bg-green-500/10 text-green-400";
    if (probability <= 0.3) return "bg-red-500/10 text-red-400";
    return "bg-amber-500/10 text-amber-400";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "from-green-500 to-emerald-600";
    if (confidence >= 0.70) return "from-green-500 to-teal-600";
    if (confidence >= 0.55) return "from-yellow-500 to-amber-600";
    if (confidence >= 0.40) return "from-orange-500 to-red-600";
    return "from-red-500 to-rose-600";
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">

            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="Home">
                <Home className="w-6 h-6" />
              </Link>
              <TrendingUp className="w-8 h-8 text-green-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                MrBeast Trading Assistant
              </h1>
            </div>

            <nav className="flex gap-6">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search words..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-500 placeholder-gray-400"
          />
        </div>

        {/* Stats Grid */}
        <section>

          <h2 className="text-2xl font-bold mb-6 text-black">
            Word Probabilities
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400"></div>
            </div>
          ) : filteredStats.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-400 text-lg">
                {filter
                  ? "No words match your search"
                  : "No data available."}
              </p>
            </div>
          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {filteredStats.map((stat) => {

                const confidenceInterp = getConfidenceInterpretation(stat.confidence);

                return (

                  <div
                    key={stat.word}
                    className="group bg-white border border-gray-200 hover:border-green-500/50 rounded-lg p-6 transition-all duration-200 hover:bg-gray-50 hover:shadow-lg hover:shadow-green-500/10 cursor-pointer"
                    onClick={() =>
                      setSelectedWord(
                        selectedWord === stat.word ? null : stat.word
                      )
                    }
                  >

                    {/* Word Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {stat.word}
                    </h3>

                    {/* Probability */}
                    <div className="mb-4">

                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">
                          Probability
                        </span>

                        <span
                          className={`text-lg font-bold ${getProbabilityBgColor(stat.probability)} px-3 py-1 rounded-full text-sm`}
                        >
                          {(stat.probability * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getProbabilityColor(stat.probability)}`}
                          style={{ width: `${stat.probability * 100}%` }}
                        />
                      </div>

                    </div>

                    {/* Confidence */}
                    <div className="mb-4">

                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">
                          Confidence
                        </span>

                        <span className="text-sm font-semibold text-blue-400">
                          {(stat.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getConfidenceColor(stat.confidence)}`}
                          style={{ width: `${stat.confidence * 100}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        {confidenceInterp.emoji} {confidenceInterp.description}
                      </p>

                    </div>

                    {/* Metrics Summary */}
                    <div className="space-y-2 pt-4 border-t border-slate-700">

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Frequency</span>
                        <span className="text-xs font-semibold text-purple-400">
                          {(stat.metrics.frequency * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Consistency</span>
                        <span className="text-xs font-semibold text-cyan-400">
                          {(stat.metrics.consistency * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Predictability</span>
                        <span className="text-xs font-semibold text-indigo-400">
                          {((1 - stat.metrics.entropy) * 100).toFixed(0)}%
                        </span>
                      </div>

                    </div>

                    {/* Expanded Metrics */}
                    {selectedWord === stat.word && (

                      <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">

                        <div className="bg-white border border-gray-200 rounded p-3">

                          <p className="text-xs text-gray-400 mb-2">
                            📊 Detailed Metrics
                          </p>

                          <div className="space-y-1 text-xs">

                            <div className="flex justify-between">
                              <span>Effective Sample Size:</span>
                              <span className="text-green-400">
                                {stat.metrics.effectiveSampleSize.toFixed(1)} videos
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span>Recency Bias:</span>
                              <span className="text-blue-400">
                                {(stat.metrics.recentBias * 100).toFixed(0)}%
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span>Entropy:</span>
                              <span className="text-yellow-400">
                                {stat.metrics.entropy.toFixed(2)}
                              </span>
                            </div>

                          </div>

                        </div>

                      </div>

                    )}

                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
