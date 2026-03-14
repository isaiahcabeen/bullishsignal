"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import Image from "next/image";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, targetDate.getTime() - Date.now())
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, targetDate.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isLive: timeLeft === 0 };
}

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [imgError, setImgError] = useState(false);

  // Example market open date — update when actual Kalshi market is live
  const marketOpenDate = new Date("2026-03-21T09:30:00-05:00");
  const countdown = useCountdown(marketOpenDate);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-10 px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Trading Assistants
        </h1>
        <p className="text-gray-400 text-lg mt-3 max-w-md mx-auto">
          Utilize these trading assistants to optimize your strategy and turn a profit!
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 shadow-sm transition"
          />
        </div>

        {/* MrBeast Event Card */}
        <div
          onClick={() => router.push("/mrbeast")}
          className="cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex min-h-[180px]"
        >
          {/* Left – MrBeast Image */}
          <div className="w-44 md:w-52 flex-shrink-0 bg-gradient-to-br from-yellow-400 to-yellow-300 relative overflow-hidden flex items-center justify-center">
            {!imgError ? (
              <Image
                src="https://yt3.googleusercontent.com/ytc/AIdro_mmFHW2qfKbHEQ_qfJJuqkBCJNLF2q_UNB_p0c8IG0=s400-c-k-c0x00ffffff-no-rj"
                alt="MrBeast"
                fill
                className="object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-4xl font-black text-yellow-700 select-none">MB</span>
            )}
          </div>

          {/* Right – Details */}
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-base md:text-lg font-bold text-gray-900 leading-snug mb-1">
                What will MrBeast say in his next YouTube video?
              </h2>
              <p className="text-xs text-gray-400 mb-3">Kalshi Prediction Market</p>
            </div>

            {/* Countdown */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Market Opens In
              </p>
              {countdown.isLive ? (
                <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                  🟢 Live Now
                </span>
              ) : (
                <div className="flex gap-2">
                  {[
                    { label: "D", value: countdown.days },
                    { label: "H", value: countdown.hours },
                    { label: "M", value: countdown.minutes },
                    { label: "S", value: countdown.seconds },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-100 rounded-lg px-2 py-1 min-w-[40px] text-center">
                      <div className="text-base font-bold text-slate-900 leading-tight">
                        {String(value).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Market Info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Volume:</span>
                <span className="font-semibold text-gray-800">$12,450</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Word ex.:</span>
                <span className="font-semibold text-gray-800">&ldquo;Chandler&rdquo;</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500 font-semibold">Yes 62¢</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500 font-semibold">No 38¢</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
