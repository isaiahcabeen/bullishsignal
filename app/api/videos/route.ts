import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Video = {
  title: string;
  date: string;
  type: string;
  words: string[];
};

const filePath = path.join(process.cwd(), "app/data/mrbeast.json");

function ensureFile() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
}

function readVideos(): Video[] {
  ensureFile();
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeVideos(videos: Video[]) {
  fs.writeFileSync(filePath, JSON.stringify(videos, null, 2));
}

export async function GET() {
  try {
    const videos = readVideos();
    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load videos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, type, date, words } = body;

    if (!title || !type || !date || !words || words.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const videos = readVideos();

    if (videos.some((v) => v.title.toLowerCase() === title.toLowerCase())) {
      return NextResponse.json(
        { error: "Video already exists" },
        { status: 400 }
      );
    }

    const newVideo: Video = { title, type, date, words };
    videos.push(newVideo);
    writeVideos(videos);

    return NextResponse.json({ success: true, words });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save video" },
      { status: 500 }
    );
  }
}