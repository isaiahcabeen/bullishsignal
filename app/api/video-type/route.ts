import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Video = {
  title: string;
  date: string;
  type: string;
  words: string[];
};

type VideoTypeResult = {
  type: string;
  probability: number;
  recentProbability: number;
  combinedProbability: number;
  count: number;
  recentCount: number;
  description: string;
  examples: string[];
  emoji: string;
  videosSinceLastType: number;
  avgSpacing: number;
};

type VideoTypePrediction = {
  types: VideoTypeResult[];
  totalVideos: number;
  recentWindow: number;
  lastVideoType: string;
  patternNote: string;
};

const filePath = path.join(process.cwd(), "app/data/mrbeast.json");

const TYPE_META: Record<string, { description: string; emoji: string }> = {
  Competition: {
    description:
      "Contestants compete in structured challenges or games for a prize. Often includes multiple rounds, elimination, and a large group of participants.",
    emoji: "🏆",
  },
  Endurance: {
    description:
      "Participants must survive or persist through extreme conditions for an extended duration to win a reward. Tests physical and mental limits.",
    emoji: "⏱️",
  },
  Comparison: {
    description:
      "Side-by-side comparison of items or experiences at wildly different price points, demonstrating the difference money makes.",
    emoji: "⚖️",
  },
  Exploration: {
    description:
      "MrBeast ventures into unusual locations, landmarks, or environments — from ancient pyramids to underground bunkers.",
    emoji: "🗺️",
  },
  Philanthropy: {
    description:
      "Giving back through large-scale charitable acts, whether building infrastructure, feeding communities, or donating to those in need.",
    emoji: "💚",
  },
};

function readVideos(): Video[] {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function startsWithVowel(word: string): boolean {
  return /^[aeiou]/i.test(word);
}

export async function GET() {
  try {
    const videos = readVideos();
    const sorted = [...videos].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totalVideos = sorted.length;
    const RECENT_WINDOW = 15;
    const recentVideos = sorted.slice(0, RECENT_WINDOW);
    const lastVideoType = sorted[0]?.type ?? "Unknown";

    // Count all types in full dataset
    const allTypeCounts: Record<string, number> = {};
    for (const v of sorted) {
      allTypeCounts[v.type] = (allTypeCounts[v.type] ?? 0) + 1;
    }

    // Count types in recent window
    const recentTypeCounts: Record<string, number> = {};
    for (const v of recentVideos) {
      recentTypeCounts[v.type] = (recentTypeCounts[v.type] ?? 0) + 1;
    }

    // Collect one example video per type (use most recent)
    const examplesByType: Record<string, string[]> = {};
    for (const v of sorted) {
      if (!examplesByType[v.type]) examplesByType[v.type] = [];
      if (examplesByType[v.type].length < 3) {
        examplesByType[v.type].push(v.title);
      }
    }

    // Markov chain: count what type follows each occurrence of lastVideoType
    // sorted is newest-first, so sorted[i+1] is older; when sorted[i+1] is lastVideoType,
    // sorted[i] (newer) is what came immediately after it chronologically.
    const patternCounts: Record<string, number> = {};
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].type === lastVideoType) {
        patternCounts[sorted[i].type] = (patternCounts[sorted[i].type] ?? 0) + 1;
      }
    }
    const patternTotal = Object.values(patternCounts).reduce((a, b) => a + b, 0);

    const allTypes = Object.keys(TYPE_META);

    // Spacing analysis: calculate average video-count gap between consecutive occurrences per type
    // and how many videos have aired since each type last appeared.
    const spacingMetrics: Record<string, { avgSpacing: number; videosSinceLast: number }> = {};
    for (const type of allTypes) {
      const positions: number[] = [];
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].type === type) positions.push(i);
      }

      // positions[0] is the index of the most recent occurrence (0 = just happened).
      const videosSinceLast = positions.length > 0 ? positions[0] : totalVideos;

      // Gap between consecutive positions represents how many video slots apart they are.
      // positions are in ascending order (newest = smallest index).
      let totalGap = 0;
      let gapCount = 0;
      for (let i = 0; i < positions.length - 1; i++) {
        totalGap += positions[i + 1] - positions[i];
        gapCount++;
      }

      const avgSpacing = gapCount > 0 ? totalGap / gapCount : totalVideos;
      spacingMetrics[type] = { avgSpacing, videosSinceLast };
    }

    const types: VideoTypeResult[] = allTypes.map((type) => {
      const count = allTypeCounts[type] ?? 0;
      const recentCount = recentTypeCounts[type] ?? 0;

      const probability = totalVideos > 0 ? count / totalVideos : 0;
      const recentProbability =
        RECENT_WINDOW > 0 ? recentCount / RECENT_WINDOW : 0;

      // Markov transition probability: how often does `type` follow lastVideoType?
      const markovProb =
        patternTotal > 0 ? (patternCounts[type] ?? 0) / patternTotal : probability;

      // Spacing-based adjustment: scale the base frequency by how "due" this type is.
      // spacingRatio = 1  → exactly at average spacing (neutral)
      // spacingRatio < 1  → appeared recently, cooling down
      // spacingRatio > 1  → overdue, boost probability
      const { avgSpacing, videosSinceLast } = spacingMetrics[type] ?? {
        avgSpacing: totalVideos,
        videosSinceLast: totalVideos,
      };
      const spacingRatio = avgSpacing > 0
        ? Math.min(videosSinceLast / avgSpacing, 2)
        : 1;
      const spacingProb = spacingRatio * probability;

      // Blended prediction: 30% historical + 30% recent + 20% spacing + 20% Markov
      const combinedProbability =
        0.3 * probability +
        0.3 * recentProbability +
        0.2 * spacingProb +
        0.2 * markovProb;

      return {
        type,
        probability,
        recentProbability,
        combinedProbability,
        count,
        recentCount,
        description: TYPE_META[type].description,
        examples: examplesByType[type] ?? [],
        emoji: TYPE_META[type].emoji,
        videosSinceLastType: videosSinceLast,
        avgSpacing: Math.round(avgSpacing * 10) / 10,
      };
    });

    // Normalize combined probabilities so they sum to 1
    const combinedSum = types.reduce((s, t) => s + t.combinedProbability, 0);
    const normalized = types.map((t) => ({
      ...t,
      combinedProbability:
        combinedSum > 0 ? t.combinedProbability / combinedSum : 0,
    }));

    // Sort by combined probability descending
    normalized.sort((a, b) => b.combinedProbability - a.combinedProbability);

    // Build pattern note
    const topPatternType =
      patternTotal > 0
        ? Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        : null;

    const patternNote =
      topPatternType
        ? `After ${startsWithVowel(lastVideoType) ? "an" : "a"} ${lastVideoType} video, ${topPatternType} has been the most common follow-up type.`
        : `The most recent video was ${startsWithVowel(lastVideoType) ? "an" : "a"} ${lastVideoType}.`;

    const result: VideoTypePrediction = {
      types: normalized,
      totalVideos,
      recentWindow: RECENT_WINDOW,
      lastVideoType,
      patternNote,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to compute video type predictions", error);
    return NextResponse.json(
      { error: "Failed to compute video type predictions" },
      { status: 500 }
    );
  }
}
