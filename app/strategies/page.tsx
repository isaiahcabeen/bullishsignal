import Link from "next/link";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

export default function StrategiesPage() {
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
          Strategies
        </h1>
        <p className="text-white text-lg mt-3 max-w-2xl mx-auto">
          Proven methods to profit long-term in the MrBeast Prediction Market on Kalshi.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">

        {/* Strategy 1 — Sniping */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-sky-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Method 1
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Sniping</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            Sniping means being the fastest trader when a market opens or when new information
            becomes available. Speed and reliability are everything — a fraction of a second can
            be the difference between a profitable fill and a missed opportunity.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Internet */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">🌐 Internet Connection</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Use a wired <strong>Ethernet</strong> connection — never rely on Wi-Fi for
                time-sensitive trades. Ethernet reduces latency and eliminates the random packet
                loss common on wireless networks. If possible, connect directly to your router
                with a Cat-6 or Cat-7 cable for the lowest ping.
              </p>
            </div>

            {/* Computer */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">💻 Computer Setup</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A fast processor (Intel i7/i9 or AMD Ryzen 7/9) with at least 16 GB of RAM
                ensures your browser and trading tabs never lag. Keep Kalshi open as the only
                active tab during market open times. Disable background apps and updates.
              </p>
            </div>

            {/* Browser */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">🖥️ Browser & Tools</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Use <strong>Google Chrome</strong> or <strong>Brave</strong> for the lowest
                overhead. Pre-load the Kalshi market page before open. Keep your account funded
                and your order size pre-filled so you only need one click at the right moment.
              </p>
            </div>

            {/* Timing */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">⏱️ Timing & Alerts</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Set up Kalshi notifications and monitor MrBeast&apos;s social channels for any hints
                about upcoming video drops. Knowing the scheduled market open time lets you be
                ready the instant contracts go live — before prices adjust to reflect crowd sentiment.
              </p>
            </div>
          </div>
        </section>

        {/* Strategy 2 — Pre-video Buying */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Method 2
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Buying Before the Video Posts</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            The second method is about informational edge — identifying which words MrBeast is
            likely to say <em>before</em> the video is published. Early buyers capture the lowest
            contract prices and benefit from price appreciation as the rest of the market catches up.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Information sources */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">🎬 Know the Video Early</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Follow MrBeast&apos;s community posts, YouTube shorts, and Twitter/X for teaser
                content. Titles, thumbnails, and behind-the-scenes clips often reveal key words
                days before the video goes live. Early intel translates directly into better entry prices.
              </p>
            </div>

            {/* Leverage */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">📈 Using Leverage Wisely</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Kalshi contracts naturally provide leverage: buying a &quot;Yes&quot; at 20¢ that resolves
                at $1 is a 5× return. Concentrate on contracts where your research gives you a
                genuine edge, and size positions proportionally to your confidence — never bet
                more than you can afford to lose on a single contract.
              </p>
            </div>

            {/* Pattern analysis */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">📊 Pattern Analysis</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Use Bullish Signal&apos;s word-probability data to identify which words appear at
                unusually high rates across MrBeast&apos;s catalogue. High-frequency words in
                challenge or philanthropy videos (e.g., &quot;win,&quot; &quot;money,&quot; &quot;last&quot;) make reliable
                long-term plays.
              </p>
            </div>

            {/* Risk management */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">🛡️ Risk Management</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Diversify across multiple word contracts rather than going all-in on one.
                Set a maximum per-trade allocation (e.g., 10% of your total capital) and
                stick to it. If a contract moves against you before the video posts, reassess
                rather than doubling down blindly.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-sky-50 border border-sky-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to put a strategy to work?</h3>
          <p className="text-gray-600 mb-6">
            Head back to the market dashboard and check live prices right now.
          </p>
          <Link
            href="/#markets"
            className="inline-block bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            View Markets
          </Link>
        </section>
      </main>
    </div>
  );
}
