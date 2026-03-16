"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BULLISH_SIGNALS_LOGO_URL } from "@/lib/constants";

type MarketInfo = {
  word: string;
  price: number;
} | null;

type Assistant = {
  title: string;
  route: string;
};

export default function Home() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [imgError, setImgError] = useState(false);
  const [marketInfo, setMarketInfo] = useState<MarketInfo>(null);
  const [marketLive, setMarketLive] = useState(false);

  const assistants: Assistant[] = [
    {
      title: "What will MrBeast say in his next YouTube video?",
      route: "/mrbeast",
    },
  ];

  const filteredAssistants = assistants.filter((assistant) =>
    assistant.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    async function fetchMarket() {
      try {
        const res = await fetch("/api/kalshi");
        const data = await res.json();

        if (res.ok && Array.isArray(data.prices) && data.prices.length > 0) {
          const first = data.prices[0];
          const word: unknown = first.word;
          const price: unknown = first.price;

          if (
            typeof word === "string" &&
            typeof price === "number" &&
            price >= 0 &&
            price <= 1
          ) {
            setMarketInfo({ word, price });
            setMarketLive(true);
          }
        }
      } catch {
        // market not open yet
      }
    }

    fetchMarket();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Strip */}
      <div className="bg-white py-3 px-4 flex justify-center items-center border-b border-gray-100">
        <img
          src={BULLISH_SIGNALS_LOGO_URL}
          alt="Bullish Signals"
          style={{ width: "97px", height: "56px" }}
        />
      </div>

      {/* Hero Section */}
      <div className="bg-sky-400 px-4 pt-10 pb-10">
        {/* Title Section */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow pb-2">
            Trading Assistants
          </h1>
          <p className="text-white text-lg mt-3">
            Utilize these trading assistants to optimize your strategy and turn a
            profit!
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
        {filteredAssistants.map((assistant) => (
          <div
            key={assistant.route}
            onClick={() => router.push(assistant.route)}
            className="cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex min-h-[180px]"
          >
            {/* Left Image */}
            <div className="w-44 md:w-52 flex-shrink-0 bg-gray-800 relative overflow-hidden flex items-center justify-center">
              {!imgError ? (
                <img
                  src="https://github.com/user-attachments/assets/e2ad1291-8065-4357-911a-ba0a41ea5668"
                  alt="MrBeast"
                  width={208}
                  height={180}
                  className="object-cover w-full h-full"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-4xl font-black text-yellow-700 select-none">
                  MB
                </span>
              )}
            </div>

            {/* Right Details */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-base md:text-lg font-bold text-gray-900 leading-snug mb-1">
                  {assistant.title}
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  Kalshi Prediction Market
                </p>
              </div>

              {/* Countdown */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Market Opens In
                </p>

                {marketLive ? (
                  <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                    🟢 Live Now
                  </span>
                ) : (
                  <div className="flex gap-2">
                    {[
                      { label: "D", value: 0 },
                      { label: "H", value: 0 },
                      { label: "M", value: 0 },
                      { label: "S", value: 0 },
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
                )}
              </div>

              {/* Market Info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Volume:</span>
                  <span className="font-semibold text-gray-800">N/A</span>
                </div>

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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
