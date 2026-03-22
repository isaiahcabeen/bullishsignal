import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { YoutubeTranscript } from "youtube-transcript";
import { WORDS } from "@/lib/words";
import { wordBoundaryRegex } from "@/lib/youtube";

// MrBeast's main YouTube channel ID
const MRBEAST_CHANNEL_ID = "UCX6OQ3DkcsbYNE6H8uQQuVA";

type Video = {
  title: string;
  date: string;
  type: string;
  words: string[];
};

type FailedVideo = {
  videoId: string;
  title: string;
  date: string;
  reason: string;
};

const filePath = path.join(process.cwd(), "app/data/mrbeast.json");
const failedPath = path.join(process.cwd(), "app/data/failed-syncs.json");

function readVideos(): Video[] {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeVideos(videos: Video[]) {
  fs.writeFileSync(filePath, JSON.stringify(videos, null, 2));
}

function readFailedSyncs(): FailedVideo[] {
  if (!fs.existsSync(failedPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(failedPath, "utf-8"));
  } catch {
    return [];
  }
}

function writeFailedSyncs(failed: FailedVideo[]) {
  fs.writeFileSync(failedPath, JSON.stringify(failed, null, 2));
}

// Keyword patterns for each video type — ordered from most specific to least specific
const TYPE_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  // Philanthropic videos: building schools/houses, helping people, adopting animals, feeding
  {
    type: "Philanthropy",
    pattern:
      /\bbuild\b.*\bschool|\bhelp\b.*\bpeople|\bgave\b|\badopt|\bsave\b.*animal|\bfeed\b|\b\d+\s+houses?\b|\bphilanthr/,
  },
  // Price-comparison videos: "$1 vs $500k", "cheap vs expensive", etc.
  {
    type: "Comparison",
    pattern: /\$\d[\d,k]*\s+vs\s+\$\d|\bcheap\s+vs\b|\bfree\s+vs\b|\bworst\s+vs\s+best\b|\bbest\s+vs\s+worst\b/,
  },
  // Endurance/survival challenges: "survive X days", "trapped", "last to leave", solitary confinement
  {
    type: "Endurance",
    pattern:
      /\bsurvive\b|\btrapped\b|\bstranded\b|\blast\s+to\b|\b\d+\s+days?\b|\b\d+\s+hours?\b|\bsolitary\b|\bbunker\b|\bprison\b/,
  },
  // Exploration videos: abandoned places, islands, caves, pyramids, temples
  {
    type: "Exploration",
    pattern: /\babandon\b|\bisland\b|\bcave\b|\bpyramid\b|\btemple\b|\bexplor\b/,
  },
];

/**
 * Automatically classifies a video type based on its title using keyword heuristics.
 * Falls back to "Competition" when no other type matches.
 */
function detectVideoType(title: string): string {
  const t = title.toLowerCase();
  for (const { type, pattern } of TYPE_PATTERNS) {
    if (pattern.test(t)) return type;
  }
  return "Competition";
}

/**
 * Fetches the transcript for a YouTube video and returns matched WORDS.
 * Retries with exponential backoff up to `maxAttempts` times on failure.
 */
async function wordsFromTranscript(
  videoId: string,
  maxAttempts = 3
): Promise<string[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const fullText = transcript.map((entry) => entry.text).join(" ");
      return WORDS.filter((word) => wordBoundaryRegex(word).test(fullText));
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // Wait before retry: 1s before attempt 2, 2s before attempt 3
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }
  }
  throw lastError;
}

/**
 * POST /api/sync-latest
 * Fetches MrBeast's most recent YouTube videos (up to `maxResults`, default 10),
 * and for each video not already in mrbeast.json, processes the transcript and
 * adds it to the database automatically.
 *
 * Query params:
 *   ?maxResults=N        - override the number of videos to fetch (1-200)
 *   ?retryFailed=true    - instead of fetching new videos, retry previously
 *                          failed transcript fetches from failed-syncs.json
 */
export async function POST(req: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const retryFailed = searchParams.get("retryFailed") === "true";

  // --- Retry previously failed videos ---
  if (retryFailed) {
    const failedList = readFailedSyncs();
    if (failedList.length === 0) {
      return NextResponse.json({ message: "No failed videos to retry", retried: [], stillFailed: [] });
    }

    const existingVideos = readVideos();
    const existingTitles = new Set(existingVideos.map((v) => v.title.toLowerCase()));

    const added: Video[] = [];
    const stillFailed: FailedVideo[] = [];

    for (const item of failedList) {
      if (existingTitles.has(item.title.toLowerCase())) continue;

      let words: string[];
      try {
        words = await wordsFromTranscript(item.videoId);
      } catch (err) {
        stillFailed.push({
          ...item,
          reason: err instanceof Error ? err.message : "Failed to fetch transcript",
        });
        continue;
      }

      const newVideo: Video = { title: item.title, date: item.date, type: detectVideoType(item.title), words };
      existingVideos.push(newVideo);
      existingTitles.add(item.title.toLowerCase());
      added.push(newVideo);
    }

    if (added.length > 0) {
      existingVideos.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      writeVideos(existingVideos);
    }

    writeFailedSyncs(stillFailed);

    return NextResponse.json({ added, stillFailed });
  }

  // --- Normal sync: fetch latest videos ---
  let maxResults = 10;

  // Support maxResults from query param first, then fall back to request body
  const qpMaxResults = searchParams.get("maxResults");
  if (qpMaxResults) {
    const parsed = parseInt(qpMaxResults, 10);
    if (!isNaN(parsed)) {
      maxResults = Math.min(Math.max(1, parsed), 200);
    }
  } else {
    try {
      const body = await req.json().catch((parseErr) => {
        console.warn("sync-latest: could not parse request body, using defaults", parseErr);
        return {};
      });
      if (body.maxResults && typeof body.maxResults === "number") {
        maxResults = Math.min(Math.max(1, body.maxResults), 200);
      }
    } catch {
      // use default
    }
  }

  // 1. Fetch latest videos from MrBeast's channel via YouTube Data API
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&channelId=${MRBEAST_CHANNEL_ID}&order=date&type=video` +
    `&maxResults=${maxResults}&key=${apiKey}`;

  let ytItems: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }>;
  try {
    const ytRes = await fetch(searchUrl);
    if (!ytRes.ok) {
      const errBody = await ytRes.text();
      return NextResponse.json(
        { error: `YouTube API error: ${ytRes.status} ${errBody}` },
        { status: 502 }
      );
    }
    const ytData = await ytRes.json();
    ytItems = ytData.items ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach YouTube API: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 502 }
    );
  }

  // 2. Load existing videos to skip duplicates
  const existingVideos = readVideos();
  const existingTitles = new Set(existingVideos.map((v) => v.title.toLowerCase()));

  const added: Video[] = [];
  const skipped: string[] = [];
  const failed: Array<{ title: string; reason: string; retryEligible: boolean }> = [];
  const newFailedSyncs: FailedVideo[] = [];

  // 3. Process each video
  for (const item of ytItems) {
    const videoId = item.id?.videoId;
    const title = item.snippet?.title;
    const publishedAt = item.snippet?.publishedAt;

    if (!videoId || !title) continue;

    if (existingTitles.has(title.toLowerCase())) {
      skipped.push(title);
      continue;
    }

    if (!publishedAt) {
      console.warn(`sync-latest: missing publishedAt for video "${title}" (${videoId}), using today's date`);
    }
    const date = publishedAt ? publishedAt.split("T")[0] : new Date().toISOString().split("T")[0];
    const type = detectVideoType(title);

    let words: string[];
    try {
      words = await wordsFromTranscript(videoId);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Failed to fetch transcript";
      // Mark as not retry-eligible only when the transcript is permanently unavailable
      // (disabled by the creator or the video has no captions). Other errors (network
      // timeouts, rate limits, etc.) are worth retrying.
      const permanentFailurePhrases = [
        "transcript is disabled",
        "no transcript available",
        "transcripts are disabled",
        "could not find transcript",
      ];
      const lowerReason = reason.toLowerCase();
      const retryEligible = !permanentFailurePhrases.some((phrase) =>
        lowerReason.includes(phrase)
      );
      failed.push({ title, reason, retryEligible });
      if (retryEligible) {
        newFailedSyncs.push({ videoId, title, date, reason });
      }
      continue;
    }

    const newVideo: Video = { title, date, type, words };
    existingVideos.push(newVideo);
    existingTitles.add(title.toLowerCase());
    added.push(newVideo);
  }

  // 4. Persist updates
  if (added.length > 0) {
    // Sort by date descending so newest videos are first
    existingVideos.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    writeVideos(existingVideos);
  }

  // 5. Merge new retry-eligible failures into persistent store
  if (newFailedSyncs.length > 0) {
    const existingFailed = readFailedSyncs();
    const existingFailedIds = new Set(existingFailed.map((f) => f.videoId));
    const merged = [
      ...existingFailed,
      ...newFailedSyncs.filter((f) => !existingFailedIds.has(f.videoId)),
    ];
    writeFailedSyncs(merged);
  }

  return NextResponse.json({ added, skipped, failed });
}

