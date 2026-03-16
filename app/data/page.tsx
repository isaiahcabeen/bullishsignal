import Link from "next/link";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

export default function DataPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between relative">
          <nav className="flex items-center gap-8">
            <Link href="/#markets" className="nav-link">Markets</Link>
            <Link href="/strategies" className="nav-link">Strategies</Link>
            <Link href="/data" className="nav-link">Data</Link>
          </nav>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/">
              <img
                src={BULLISH_SIGNALS_LOGO_URL}
                alt="Bullish Signals"
                style={{ width: "97px", height: "56px" }}
              />
            </Link>
          </div>
          <nav className="flex items-center gap-8">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/faq" className="nav-link">FAQ</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-sky-400 px-4 pt-12 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow pb-2">
          Our Data
        </h1>
        <p className="text-white text-lg mt-3 max-w-2xl mx-auto">
          Understanding the data behind every prediction — transparency you can trust.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

        {/* Section 1 — Video transcript data */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">📹 Video Transcript Data</h2>
          <p className="text-gray-600 leading-relaxed">
            Our core dataset is built from the transcripts of MrBeast&apos;s published YouTube videos.
            We analyze the spoken words in each video to calculate how often a given word appears
            across the entire catalogue. This gives us an empirical baseline — a word that shows
            up in 80% of videos is a much safer bet than one that appeared only once.
          </p>
        </section>

        {/* Section 2 — Probability model */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">📐 Probability Model</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Raw frequency alone isn&apos;t enough. We also compute several supporting metrics to
            arrive at a calibrated probability estimate:
          </p>
          <ul className="space-y-3">
            {[
              {
                label: "Frequency",
                desc: "How many videos contain the target word at least once.",
              },
              {
                label: "Consistency",
                desc:
                  "Whether usage is steady across videos or clustered in a specific era of MrBeast&apos;s content.",
              },
              {
                label: "Entropy",
                desc:
                  "A measure of how predictable word usage is. Low entropy = more reliable signal.",
              },
              {
                label: "Recent Bias",
                desc:
                  "More recent videos are weighted higher to account for evolving content style and language.",
              },
              {
                label: "Effective Sample Size",
                desc:
                  "Adjusts confidence intervals based on how many videos are included in the analysis.",
              },
            ].map(({ label, desc }) => (
              <li key={label} className="flex gap-3">
                <span className="mt-1 w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                <p className="text-gray-600 text-sm leading-relaxed">
                  <strong className="text-gray-800">{label}:</strong> {desc}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 3 — Kalshi market prices */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">💱 Kalshi Market Prices</h2>
          <p className="text-gray-600 leading-relaxed">
            We pull live contract prices directly from the Kalshi API. These prices represent
            the market&apos;s collective belief about the probability of each word appearing. By
            comparing Kalshi prices to our model&apos;s estimates we can identify contracts that are
            overpriced or underpriced — and surface the best opportunities.
          </p>
        </section>

        {/* Section 4 — Why this data */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🤔 Why This Approach?</h2>
          <p className="text-gray-600 leading-relaxed">
            MrBeast&apos;s content is unusually consistent in vocabulary and format, which makes
            statistical modeling particularly effective. Unlike sports or political prediction
            markets where outcomes are influenced by many unpredictable external factors,
            MrBeast&apos;s language patterns are largely self-determined — meaning that historical
            data is a genuinely informative predictor of future content.
          </p>
        </section>

        {/* Section 5 — Limitations */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">⚠️ Data Limitations</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            No dataset is perfect. Transcripts can contain auto-generated errors. New video
            formats or collaborations may shift vocabulary in unpredictable ways. Our model
            is updated regularly, but it reflects <em>historical</em> patterns — past performance
            is not a guarantee of future results. Always combine data-driven analysis with
            your own judgment.
          </p>
        </section>
      </main>
    </div>
  );
}
