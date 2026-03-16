import Link from "next/link";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

type FaqItem = {
  question: string;
  answer: string;
};

const faqSections: { title: string; items: FaqItem[] }[] = [
  {
    title: "Kalshi Basics",
    items: [
      {
        question: "How do Kalshi contracts work?",
        answer:
          "A Kalshi contract is a binary outcome contract. You buy a 'Yes' share for a price between $0.01 and $0.99, and if the event resolves 'Yes' the contract pays out $1.00. If it resolves 'No' it pays $0.00. The price at which you buy reflects the implied probability — e.g., buying at 40¢ means you're paying for a ~40% chance of a $1 payout. You can also sell 'No' contracts if you believe an event won't happen.",
      },
      {
        question: "What are the fees on Kalshi?",
        answer:
          "Kalshi charges a trading fee on winning contracts. The fee is capped per-contract and is generally a small percentage of your winnings. Check Kalshi's official fee schedule for the current rates, as they may change over time.",
      },
      {
        question: "How do I deposit and withdraw funds?",
        answer:
          "Kalshi supports bank transfers (ACH) and wire transfers. Deposits typically clear within 1–3 business days. Withdrawals follow a similar timeline. Always verify the latest funding options on Kalshi's website.",
      },
      {
        question: "Can I sell a contract before it resolves?",
        answer:
          "Yes. Kalshi is an exchange, so you can buy and sell contracts at any time while the market is open. If the price of your contract rises after you buy it, you can sell for a profit before the event even resolves.",
      },
    ],
  },
  {
    title: "Legality & Regulation",
    items: [
      {
        question: "Is Kalshi legal?",
        answer:
          "Yes. Kalshi is a federally regulated exchange operating under the oversight of the Commodity Futures Trading Commission (CFTC). It is the first regulated prediction-market exchange in the United States. U.S. residents can legally trade on Kalshi. Some markets may be restricted to specific jurisdictions — always review Kalshi's eligibility requirements for your location.",
      },
      {
        question: "Is trading on Kalshi considered gambling?",
        answer:
          "Legally, no. Kalshi is a CFTC-regulated exchange, which categorizes it as a derivatives market rather than a gambling platform. However, individual states may have varying interpretations, and tax treatment of gains can differ. Consult a tax or legal professional for advice specific to your situation.",
      },
      {
        question: "Do I need to pay taxes on Kalshi winnings?",
        answer:
          "In the United States, profits from prediction market contracts are generally considered taxable income. Kalshi may issue tax forms for certain thresholds of earnings. Keep records of all your trades and consult a tax advisor to ensure you report correctly.",
      },
    ],
  },
  {
    title: "Bullish Signal & This Platform",
    items: [
      {
        question: "Is Bullish Signal affiliated with Kalshi or MrBeast?",
        answer:
          "No. Bullish Signal is an independent, third-party analytical platform. We are not affiliated with, endorsed by, or sponsored by Kalshi, MrBeast, or any of their associated entities. We use publicly available data and the Kalshi public API.",
      },
      {
        question: "How accurate are Bullish Signal's predictions?",
        answer:
          "Our models are built on historical transcript data and statistical analysis. While we aim for accuracy, no model can guarantee future results. Market outcomes depend on many factors that may not be captured in historical data. Use our analysis as one input among many, not as a definitive prediction.",
      },
      {
        question: "How often is the data updated?",
        answer:
          "We update our word-probability models whenever new MrBeast video data becomes available and pull live Kalshi prices in real time. Check the dashboard for the most current market prices.",
      },
    ],
  },
];

export default function FaqPage() {
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
          FAQ
        </h1>
        <p className="text-white text-lg mt-3 max-w-2xl mx-auto">
          Answers to the most common questions about Kalshi, prediction markets, and Bullish Signal.
        </p>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {faqSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">
              {section.title}
            </h2>
            <div className="space-y-6">
              {section.items.map((item) => (
                <div key={item.question}>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {item.question}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
