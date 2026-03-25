import { WORDS } from "./words";

// ============================================================
// Types
// ============================================================

export type Video = {
  title: string;
  date: string;
  type: string;
  words: string[];
};

export type WordPrediction = {
  probability: number;
  confidence: number;
  interval: {
    low: number;
    high: number;
  };
  metrics: {
    frequency: number;
    consistency: number;
    entropy: number;
    recentBias: number;
    effectiveSampleSize: number;
  };
};

// ============================================================
// Configuration
// ============================================================

export const DEFAULT_CONFIG = {
  DECAY_LAMBDA: 0.001,
  MIN_TYPE_VIDEOS: 3,
  TYPE_BLEND_RATIO: 0.6,
  RECENCY_IDEAL: 0.6,
  RECENCY_TOLERANCE: 0.5,

  CONFIDENCE_WEIGHTS: {
    frequency: 0.20,
    consistency: 0.20,
    entropy: 0.20,
    sampleSize: 0.30,
    recency: 0.10,
  },

  SAMPLE_SIZE_TARGET: 30,
} as const;

type Config = typeof DEFAULT_CONFIG;

// ============================================================
// Utility Functions
// ============================================================

function shannonEntropy(probability: number): number {
  if (probability <= 0 || probability >= 1) return 0;

  return -(
    probability * Math.log2(probability) +
    (1 - probability) * Math.log2(1 - probability)
  );
}

// ------------------------------------------------------------
// Consistency
// ------------------------------------------------------------

function calculateConsistency(videos: Video[], word: string) {
  if (videos.length < 3) {
    return { variance: 0, consistency: 0.5 };
  }

  const chunkSize = Math.ceil(videos.length / 3);
  const chunks: number[] = [];

  for (let i = 0; i < videos.length; i += chunkSize) {
    const chunk = videos.slice(i, i + chunkSize);

    const appearances = chunk.filter((v) => v.words.includes(word)).length;

    chunks.push(appearances / chunk.length);
  }

  const mean = chunks.reduce((a, b) => a + b, 0) / chunks.length;

  const variance =
    chunks.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    chunks.length;

  const normalizedVariance = Math.min(1, variance * 4);

  const consistency = 1 - normalizedVariance;

  return { variance: normalizedVariance, consistency };
}

// ------------------------------------------------------------
// Effective Sample Size
// ------------------------------------------------------------

function calculateEffectiveSampleSize(
  videos: Video[],
  decayLambda: number
) {
  const now = Date.now();

  let totalWeight = 0;

  videos.forEach((video) => {
    const videoTime = new Date(video.date).getTime();

    if (isNaN(videoTime)) return;

    const ageDays =
      (now - videoTime) / (1000 * 60 * 60 * 24);

    const weight = Math.exp(-decayLambda * ageDays);

    totalWeight += weight;
  });

  return totalWeight;
}

// ------------------------------------------------------------
// Recency Bias
// ------------------------------------------------------------

function calculateRecentBias(
  videos: Video[],
  decayLambda: number
) {
  if (videos.length < 2) return 0.5;

  const now = Date.now();

  const sorted = [...videos].sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const midpoint = Math.ceil(sorted.length / 2);

  const recent = sorted.slice(0, midpoint);
  const old = sorted.slice(midpoint);

  let recentWeight = 0;
  let oldWeight = 0;

  for (const video of recent) {
    const age =
      (now - new Date(video.date).getTime()) /
      (1000 * 60 * 60 * 24);

    recentWeight += Math.exp(-decayLambda * age);
  }

  for (const video of old) {
    const age =
      (now - new Date(video.date).getTime()) /
      (1000 * 60 * 60 * 24);

    oldWeight += Math.exp(-decayLambda * age);
  }

  const total = recentWeight + oldWeight;

  return total === 0 ? 0.5 : recentWeight / total;
}

// ============================================================
// Bayesian Beta Distribution
// ============================================================

function betaMean(alpha: number, beta: number) {
  return alpha / (alpha + beta);
}

function betaVariance(alpha: number, beta: number) {
  return (
    (alpha * beta) /
    (Math.pow(alpha + beta, 2) * (alpha + beta + 1))
  );
}

function betaInterval(alpha: number, beta: number) {
  const mean = betaMean(alpha, beta);

  const variance = betaVariance(alpha, beta);

  const std = Math.sqrt(variance);

  return {
    low: Math.max(0, mean - 2 * std),
    high: Math.min(1, mean + 2 * std),
  };
}

// ============================================================
// Confidence Calculation
// ============================================================

function calculateConfidence(
  videos: Video[],
  word: string,
  probability: number,
  weightedYes: number,
  totalWeight: number,
  config: Config
) {
  const frequency = weightedYes / (totalWeight || 1);

  const { consistency } = calculateConsistency(videos, word);

  const entropy = shannonEntropy(probability);

  const entropyConfidence = 1 - entropy;

  const effectiveSampleSize =
    calculateEffectiveSampleSize(videos, config.DECAY_LAMBDA);

  const sampleSizeConfidence = Math.min(
    1,
    effectiveSampleSize / config.SAMPLE_SIZE_TARGET
  );

  const recentBias = calculateRecentBias(
    videos,
    config.DECAY_LAMBDA
  );

  const recencyDeviation = Math.abs(
    recentBias - config.RECENCY_IDEAL
  );

  const recencyConfidence = Math.max(
    0,
    1 - recencyDeviation / config.RECENCY_TOLERANCE
  );

  const frequencyScore = Math.abs(frequency - 0.5) * 2;

  const w = config.CONFIDENCE_WEIGHTS;

  const confidence =
    w.frequency * frequencyScore +
    w.consistency * consistency +
    w.entropy * entropyConfidence +
    w.sampleSize * sampleSizeConfidence +
    w.recency * recencyConfidence;

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    metrics: {
      frequency,
      consistency,
      entropy,
      recentBias,
      effectiveSampleSize,
    },
  };
}

// ============================================================
// Probability Engine
// ============================================================

export function calculateProbabilities(
  videos: Video[],
  targetType?: string,
  config: Config = DEFAULT_CONFIG,
  words: string[] = WORDS
): Record<string, WordPrediction> {

  const now = Date.now();

  const sorted = [...videos].sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const predictions: Record<string, WordPrediction> = {};

  for (const word of words) {

    let weightedYes = 0;
    let totalWeight = 0;

    for (const video of sorted) {

      const videoTime = new Date(video.date).getTime();

      if (isNaN(videoTime)) continue;

      const ageDays =
        (now - videoTime) / (1000 * 60 * 60 * 24);

      const weight = Math.exp(
        -config.DECAY_LAMBDA * ageDays
      );

      if (video.words.includes(word)) {
        weightedYes += weight;
      }

      totalWeight += weight;
    }

    const alpha = weightedYes + 1;
    const beta = totalWeight - weightedYes + 1;

    let probability = betaMean(alpha, beta);

    if (targetType) {

      const typeVideos = sorted.filter(
        (v) => v.type === targetType
      );

      if (typeVideos.length >= config.MIN_TYPE_VIDEOS) {

        const typeYes =
          typeVideos.filter((v) => v.words.includes(word)).length;

        const typeAlpha = typeYes + 1;
        const typeBeta = typeVideos.length - typeYes + 1;

        const typeProb = betaMean(typeAlpha, typeBeta);

        probability =
          config.TYPE_BLEND_RATIO * typeProb +
          (1 - config.TYPE_BLEND_RATIO) * probability;
      }
    }

    const interval = betaInterval(alpha, beta);

    const { confidence, metrics } = calculateConfidence(
      sorted,
      word,
      probability,
      weightedYes,
      totalWeight,
      config
    );

    predictions[word] = {
      probability,
      confidence,
      interval,
      metrics,
    };
  }

  return predictions;
}

// ============================================================
// Filter Strong Signals
// ============================================================

export function filterHighConfidence(
  predictions: Record<string, WordPrediction>,
  confidenceThreshold = 0.65,
  probabilityThreshold = 0.65
) {

  const result: Record<string, WordPrediction> = {};

  for (const [word, pred] of Object.entries(predictions)) {

    const strongSignal =
      pred.probability >= probabilityThreshold ||
      pred.probability <= 1 - probabilityThreshold;

    if (
      pred.confidence >= confidenceThreshold &&
      strongSignal
    ) {
      result[word] = pred;
    }
  }

  return result;
}

// ============================================================
// Recommendation Engine
// ============================================================

export function getRecommendation(
  probability: number,
  marketPrice: number
) {

  const expectedValue = probability - marketPrice;

  const profitPotential = Math.max(0, 1 - marketPrice);
  const lossRisk = marketPrice;

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  if (marketPrice >= 0.95) riskLevel = "CRITICAL";
  else if (marketPrice >= 0.80) riskLevel = "HIGH";
  else if (marketPrice >= 0.60) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  let action: "BUY" | "WAIT";

  if (marketPrice >= 0.90 && probability <= 0.70) {
    action = "WAIT";
  } else if (probability <= 0.25 && marketPrice >= 0.40) {
    action = "WAIT";
  } else if (expectedValue > 0.10) {
    action = "BUY";
  } else if (expectedValue > 0 && marketPrice < 0.30) {
    action = "BUY";
  } else {
    action = "WAIT";
  }

  return {
    action,
    expectedValue,
    riskLevel,
    profitPotential,
    lossRisk,
  };
}

// ============================================================
// UI Helpers
// ============================================================

export function getRecommendationColor(action: "BUY" | "WAIT") {
  return action === "BUY"
    ? "from-green-500 to-emerald-600"
    : "from-yellow-500 to-amber-600";
}

export function getRiskColor(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
) {
  const colors = {
    LOW: "text-green-400",
    MEDIUM: "text-yellow-400",
    HIGH: "text-orange-400",
    CRITICAL: "text-red-400",
  };

  return colors[riskLevel];
}

// ============================================================
// Confidence Interpretation
// ============================================================

export function getConfidenceInterpretation(
  confidence: number
) {

  if (confidence >= 0.85) {
    return {
      level: "VERY_HIGH",
      description: "Highly reliable prediction based on strong data",
      emoji: "🟢",
    };
  }

  if (confidence >= 0.70) {
    return {
      level: "HIGH",
      description: "Reliable prediction with good data quality",
      emoji: "🟢",
    };
  }

  if (confidence >= 0.55) {
    return {
      level: "MODERATE",
      description: "Reasonable prediction with some uncertainty",
      emoji: "🟡",
    };
  }

  if (confidence >= 0.40) {
    return {
      level: "LOW",
      description: "Limited confidence due to weak signals",
      emoji: "🟠",
    };
  }

  return {
    level: "VERY_LOW",
    description: "Unreliable prediction due to insufficient data",
    emoji: "🔴",
  };
}

