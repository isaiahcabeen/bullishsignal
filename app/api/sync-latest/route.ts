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

const filePath = path.join(process.cwd(), "app/data/mrbeast.json");

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
 */
async function wordsFromTranscript(videoId: string): Promise<string[]> {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const fullText = transcript.map((entry) => entry.text).join(" ");
  return WORDS.filter((word) => wordBoundaryRegex(word).test(fullText));
}

/**
 * POST /api/sync-latest
 * Fetches MrBeast's most recent YouTube videos (up to `maxResults`, default 10),
 * and for each video not already in mrbeast.json, processes the transcript and
 * adds it to the database automatically.
 */
export async function POST(req: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY environment variable is not set" },
      { status: 500 }
    );
  }

  let maxResults = 10;
  try {
    const body = await req.json().catch((parseErr) => {
      console.warn("sync-latest: could not parse request body, using defaults", parseErr);
      return {};
    });
    if (body.maxResults && typeof body.maxResults === "number") {
      maxResults = Math.min(Math.max(1, body.maxResults), 50);
    }
  } catch {
    // use default
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
  const failed: Array<{ title: string; reason: string }> = [];

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
      failed.push({
        title,
        reason: err instanceof Error ? err.message : "Failed to fetch transcript",
      });
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

  return NextResponse.json({ added, skipped, failed });
}
