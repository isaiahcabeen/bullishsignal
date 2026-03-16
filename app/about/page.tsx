import Link from "next/link";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

export default function AboutPage() {
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
          About
        </h1>
        <p className="text-white text-lg mt-3 max-w-2xl mx-auto">
          Who we are, what we do, and what you should know before trading.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">

        {/* Section 1 — What is Bullish Signal */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What is Bullish Signal?</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            <strong className="text-gray-800">Bullish Signal</strong> is a data-driven trading
            assistant platform built for prediction market traders. Our first assistant is focused
            on the MrBeast word-prediction markets on Kalshi — we analyze historical video
            transcripts to surface statistically-backed probability estimates for each contract,
            helping traders make more informed decisions.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Our goal is simple: give everyday traders the same kind of analytical edge that
            institutional players have always enjoyed, but applied to the fast-growing world of
            event-based prediction markets.
          </p>
        </section>

        <hr className="border-gray-100" />

        {/* Section 2 — What are prediction markets */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What are Prediction Markets?</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Prediction markets are exchanges where participants trade contracts whose value
            is tied to the outcome of a real-world event. Each contract pays out <strong>$1</strong> if
            the event occurs, and <strong>$0</strong> if it does not. The price of the contract —
            expressed in cents — reflects the crowd&apos;s collective estimate of the probability of
            that event happening.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            For example, a contract priced at <strong>35¢</strong> implies the market thinks
            there is roughly a 35% chance the event resolves &quot;Yes.&quot; If you believe the true
            probability is higher, buying at 35¢ is a positive-expected-value trade.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Prediction markets aggregate information from many traders, which often makes them
            more accurate than individual forecasts. They are used for everything from elections
            and sports to entertainment and economics — and now, content creator word choices.
          </p>
        </section>

        <hr className="border-gray-100" />

        {/* Section 3 — Disclaimer */}
        <section className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Disclaimer</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Bullish Signal is an <strong>informational and educational platform only</strong>.
            Nothing on this website constitutes financial, investment, or legal advice. All
            content is provided for informational purposes and should not be relied upon as
            the sole basis for any trading decision.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Trading prediction market contracts involves real financial risk. You may lose
            some or all of the money you invest. Past performance of our models or analysis
            does not guarantee future results. Market conditions can change rapidly, and
            statistical models are inherently imperfect.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Always do your own research, trade only with money you can afford to lose, and
            consult a qualified financial advisor if needed. By using this platform you
            acknowledge that you understand these risks and agree to our terms of use.
          </p>
        </section>
      </main>
    </div>
  );
}
