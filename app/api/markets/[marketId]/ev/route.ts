import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { calculateProbabilities, getRecommendation } from "@/lib/probability";
import { getMarketById } from "@/lib/markets";

type Video = {
  title: string;
  date: string;
  type: string;
  words: string[];
};

interface WordPredictionResponse {
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
}

interface RecommendationResponse extends WordPredictionResponse {
  marketPrice: number;
  expectedValue: number;
  action: "BUY" | "WAIT";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  profitPotential: number;
  lossRisk: number;
}

interface PriceInput {
  [word: string]: number;
}

const VALID_VIDEO_TYPES = [
  "Competition",
  "Endurance",
  "Comparison",
  "Exploration",
  "Philanthropy",
];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; timestamp: number }>();

function readVideos(dataFile: string): Video[] {
  const filePath = path.join(process.cwd(), "app/data", dataFile);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${dataFile}:`, err);
    return [];
  }
}

function getFromCache(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

function sortRecommendations(
  a: RecommendationResponse,
  b: RecommendationResponse
) {
  const ACTION_PRIORITY = { BUY: 0, WAIT: 1 } as const;
  const aPriority = ACTION_PRIORITY[a.action] ?? 2;
  const bPriority = ACTION_PRIORITY[b.action] ?? 2;
  if (aPriority !== bPriority) return aPriority - bPriority;
  return (b.expectedValue ?? 0) - (a.expectedValue ?? 0);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const market = getMarketById(marketId);

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  const words = market.words.map((w) => w.label);
  const cacheKey = `probabilities:${marketId}`;

  try {
    const cached = getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const videos = readVideos(market.dataFile);

    if (videos.length === 0) {
      return NextResponse.json([]);
    }

    const predictions = calculateProbabilities(
      videos,
      undefined,
      undefined,
      words
    );

    const appearanceRates = words.reduce(
      (acc, word) => {
        const count = videos.filter((v) => v.words.includes(word)).length;
        acc[word] = (count / videos.length) * 100;
        return acc;
      },
      {} as Record<string, number>
    );

    const results: WordPredictionResponse[] = words
      .map((word) => {
        const pred = predictions[word];
        return {
          word,
          probability: pred?.probability ?? 0,
          confidence: pred?.confidence ?? 0,
          metrics: pred?.metrics ?? {
            frequency: 0,
            consistency: 0,
            entropy: 0,
            recentBias: 0,
            effectiveSampleSize: 0,
          },
          appearanceRate: appearanceRates[word] ?? 0,
        };
      })
      .sort((a, b) => b.probability - a.probability);

    setCache(cacheKey, results);
    return NextResponse.json(results);
  } catch (error) {
    console.error(`GET /api/markets/${marketId}/ev error:`, error);
    return NextResponse.json(
      { error: "Failed to calculate statistics" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const market = getMarketById(marketId);

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  try {
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      prices?: PriceInput;
      videoType?: string;
      wordsToAnalyze?: string[];
    };

    const { prices, videoType, wordsToAnalyze } = body;

    if (!prices || typeof prices !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid market prices" },
        { status: 400 }
      );
    }

    for (const [word, price] of Object.entries(prices)) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0 || numPrice > 1) {
        return NextResponse.json(
          { error: `Invalid price for "${word}": must be between 0 and 1` },
          { status: 400 }
        );
      }
    }

    if (
      videoType &&
      videoType !== "Unknown" &&
      !VALID_VIDEO_TYPES.includes(videoType)
    ) {
      return NextResponse.json(
        {
          error: `Invalid video type. Must be one of: ${[...VALID_VIDEO_TYPES, "Unknown"].join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (wordsToAnalyze && !Array.isArray(wordsToAnalyze)) {
      return NextResponse.json(
        { error: "wordsToAnalyze must be an array" },
        { status: 400 }
      );
    }

    const marketWords = market.words.map((w) => w.label);
    const videos = readVideos(market.dataFile);
    const predictions = calculateProbabilities(
      videos,
      videoType && videoType !== "Unknown" ? videoType : undefined,
      undefined,
      marketWords
    );

    const wordsToProcess =
      Array.isArray(wordsToAnalyze) && wordsToAnalyze.length > 0
        ? wordsToAnalyze.filter((w) => prices[w] !== undefined)
        : Object.keys(prices);

    if (wordsToProcess.length === 0) {
      return NextResponse.json(
        { error: "No valid words with prices provided" },
        { status: 400 }
      );
    }

    const results: RecommendationResponse[] = [];

    for (const word of wordsToProcess) {
      const pred = predictions[word];
      const probability = pred?.probability ?? 0;
      const marketPrice = prices[word];
      if (marketPrice === undefined) continue;

      const recommendation = getRecommendation(probability, marketPrice);

      results.push({
        word,
        probability,
        confidence: pred?.confidence ?? 0,
        metrics: pred?.metrics ?? {
          frequency: 0,
          consistency: 0,
          entropy: 0,
          recentBias: 0,
          effectiveSampleSize: 0,
        },
        appearanceRate:
          videos.length > 0
            ? (videos.filter((v) => v.words.includes(word)).length /
                videos.length) *
              100
            : 0,
        marketPrice,
        expectedValue: recommendation.expectedValue,
        action: recommendation.action,
        riskLevel: recommendation.riskLevel,
        profitPotential: recommendation.profitPotential,
        lossRisk: recommendation.lossRisk,
      });
    }

    results.sort(sortRecommendations);
    return NextResponse.json(results);
  } catch (error) {
    console.error(`POST /api/markets/${marketId}/ev error:`, error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to calculate predictions" },
      { status: 500 }
    );
  }
}
