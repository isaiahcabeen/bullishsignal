import crypto from "crypto";
import { WORDS } from "./words";

const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL ?? "https://api.kalshi.co";
const KALSHI_KEY_ID = process.env.KALSHI_API_KEY_ID;
const KALSHI_PRIVATE_KEY = (process.env.KALSHI_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

// ... rest of the file continues with all the existing functions
