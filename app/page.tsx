"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";
import { MARKETS } from "@/lib/markets";

type KalshiPrice = {
  word: string;
  ticker: string;
  title: string;
  price: number;
};

type MarketMetadata = {
  ticker: string;
  title: string;
  status: string;
  open_time?: string;
  close_time?: string;
  result?: string;
};

type MarketInfo = {
  word: string;
  price: number;
} | null;

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type MarketPhase =
  | "live"
  | "opening-soon"
  | "closed"
  | "no-market"
  | "loading";

function computeCountdown(targetMs: number): CountdownState {
  const diff = Math.max(0, targetMs - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

type LiveMarketState = {
  marketInfo: MarketInfo;
  marketPhase: MarketPhase;
  countdownTarget: number | null;
  countdown: CountdownState;
  lastUpdated: string | null;
};

function useLiveMarket(marketId: string): LiveMarketState {
  const [marketInfo, setMarketInfo] = useState<MarketInfo>(null);
  const [marketPhase, setMarketPhase] = useState<MarketPhase>("loading");
  const [countdownTarget, setCountdownTarget] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    function derivePhase(metadata: MarketMetadata[], prices: KalshiPrice[]) {
      const openMarket = metadata.find((m) => m.status === "open");
      if (openMarket && prices.length > 0) {
        setMarketPhase("live");
        setCountdownTarget(
          openMarket.close_time
            ? new Date(openMarket.close_time).getTime()
            : null
        );
        return;
      }
      if (openMarket) {
        setMarketPhase("opening-soon");
        setCountdownTarget(
          openMarket.open_time
            ? new Date(openMarket.open_time).getTime()
            : null
        );
        return;
      }
      if (metadata.find((m) => m.status === "closed")) {
        setMarketPhase("closed");
        setCountdownTarget(null);
        return;
      }
      setMarketPhase("no-market");
      setCountdownTarget(null);
    }

    async function fetchMarket() {
      try {
        const res = await fetch(`/api/markets/${marketId}/kalshi`);
        const data = await res.json();

        if (res.ok && Array.isArray(data.prices) && data.prices.length > 0) {
          const first: KalshiPrice = data.prices[0];
          if (
            typeof first.word === "string" &&
            typeof first.price === "number" &&
            first.price >= 0 &&
            first.price <= 1
          ) {
            setMarketInfo({ word: first.word, price: first.price });
            setLastUpdated(
              new Date().toLocaleTimeString("en-US", {
                timeZone: "America/Chicago",
              })
            );
          }
        } else {
          setMarketInfo(null);
        }

        derivePhase(data.marketMetadata ?? [], data.prices ?? []);
      } catch {
        setMarketPhase("no-market");
      }
    }

    fetchMarket();
    const interval = setInterval(fetchMarket, 15000);
    return () => clearInterval(interval);
  }, [marketId]);

  useEffect(() => {
    if (countdownTarget === null) return;
    const tick = () => setCountdown(computeCountdown(countdownTarget));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [countdownTarget]);

  return { marketInfo, marketPhase, countdownTarget, countdown, lastUpdated };
}

function MarketCard({
  market,
  imgError,
  onImgError,
}: {
  market: (typeof MARKETS)[number];
  imgError: boolean;
  onImgError: () => void;
}) {
  const router = useRouter();
  const { marketInfo, marketPhase, countdownTarget, countdown, lastUpdated } =
    useLiveMarket(market.id);

  const phaseLabel =
    marketPhase === "loading"
      ? "Loading market data…"
      : marketPhase === "live"
      ? "Live Now · Market Closes In"
      : marketPhase === "opening-soon"
      ? "Market Opens In"
      : marketPhase === "closed"
      ? "Market Closed"
      : "No Upcoming Market";

  return (
    <div
      onClick={() => router.push(market.path ?? `/markets/${market.id}`)}
      className="cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex min-h-[180px]"
    >
      {/* Left Image */}
      <div className="w-44 md:w-52 flex-shrink-0 bg-gray-800 relative overflow-hidden flex items-center justify-center">
        {market.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={market.imageUrl}
            alt={market.title}
            width={208}
            height={180}
            className="object-cover w-full h-full"
            onError={onImgError}
          />
        ) : (
          <span className="text-4xl select-none">{market.emoji}</span>
        )}
      </div>

      {/* Right Details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-base md:text-lg font-bold text-gray-900 leading-snug mb-1">
            {market.title}
          </h2>
          <p className="text-xs text-gray-400 mb-3">Kalshi Prediction Market</p>
        </div>

        {/* Status + Countdown */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {phaseLabel}
          </p>

          {marketPhase === "live" ? (
            <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
              🟢 Live Now
            </span>
          ) : marketPhase === "closed" ? (
            <span className="inline-block bg-gray-100 text-gray-600 font-semibold px-3 py-1 rounded-full text-sm">
              🔒 Market Closed
            </span>
          ) : marketPhase === "no-market" ? (
            <span className="inline-block bg-sky-50 text-sky-600 font-semibold px-3 py-1 rounded-full text-sm">
              No upcoming market
            </span>
          ) : countdownTarget !== null ? (
            <div className="flex gap-2">
              {[
                { label: "D", value: countdown.days },
                { label: "H", value: countdown.hours },
                { label: "M", value: countdown.minutes },
                { label: "S", value: countdown.seconds },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-100 rounded-lg px-2 py-1 min-w-[40px] text-center"
                >
                  <div className="text-base font-bold text-slate-900 leading-tight">
                    {String(value).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="inline-block bg-sky-50 text-sky-600 font-semibold px-3 py-1 rounded-full text-sm">
              No upcoming market
            </span>
          )}
        </div>

        {/* Market Info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Word:</span>
            <span className="font-semibold text-gray-800">
              {marketInfo ? `"${marketInfo.word}"` : "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500 font-semibold">
              {marketInfo
                ? `Yes ${(marketInfo.price * 100).toFixed(0)}¢`
                : "N/A"}
            </span>
          </div>
        </div>

        {lastUpdated && marketPhase === "live" && (
          <p className="text-xs text-gray-400 mt-2">Updated: {lastUpdated}</p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const filteredMarkets = MARKETS.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center">
          {/* Left nav */}
          <nav className="flex items-center gap-6 flex-1 justify-start">
            <Link href="/#markets" className="text-gray-700 hover:text-blue-600 font-medium">
              Markets
            </Link>
            <Link href="/strategies" className="text-gray-700 hover:text-blue-600 font-medium">
              Strategies
            </Link>
            <Link href="/data" className="text-gray-700 hover:text-blue-600 font-medium">
              Data
            </Link>
          </nav>

          {/* Centered Logo */}
          <Link href="/" className="flex-shrink-0 mx-8">
            <img
              src={BULLISH_SIGNALS_LOGO_URL}
              alt="Bullish Signals"
              style={{ width: "97px", height: "56px" }}
            />
          </Link>

          {/* Right nav */}
          <nav className="flex items-center gap-6 flex-1 justify-end">
            <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium">
              About
            </Link>
            <Link href="/faq" className="text-gray-700 hover:text-blue-600 font-medium">
              FAQ
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div id="markets" className="hero-banner bg-sky-400 px-4 pt-10 pb-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow pb-2">
            Trading Assistants
          </h1>
          <p className="text-white text-lg mt-3">
            Utilize these trading assistants to optimize your strategy and turn a profit!
          </p>
        </div>

        {/* Search Box */}
        <div className="flex justify-center mt-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title..."
            className="w-full max-w-xl px-4 py-3 border border-sky-200 rounded-lg shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 flex flex-col gap-6 max-w-2xl">
        {filteredMarkets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            imgError={!!imgErrors[market.id]}
            onImgError={() =>
              setImgErrors((prev) => ({ ...prev, [market.id]: true }))
            }
          />
        ))}
      </div>
    </div>
  );
}
