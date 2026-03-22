import crypto from "crypto";
import { WORDS } from "./words";

const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL ?? "https://api.kalshi.co";
const KALSHI_KEY_ID = process.env.KALSHI_API_KEY_ID;
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY ?? "";

export interface KalshiMarketPrice {
  word: string;
  ticker: string;
  title: string;
  price: number; // 0-1
}

export interface KalshiMarketMetadata {
  ticker: string;
  title: string;
  status: string;
  open_time?: string;
  close_time?: string;
  result?: string;
}

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  yes_ask?: number;
  yes_bid?: number;
  last_price?: number;
  status?: string;
  open_time?: string;
  close_time?: string;
  result?: string;
  eligible_contract_types?: string[];
}

function generateAuthHeaders(
  method: string,
  path: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const message = timestamp + method.toUpperCase() + path;

  const signature = crypto
    .sign(
      "SHA256",
      Buffer.from(message),
      {
        key: KALSHI_PRIVATE_KEY,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      }
    )
    .toString("base64");

  return {
    "KALSHI-ACCESS-KEY": KALSHI_KEY_ID!,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": signature,
  };
}

function extractWordFromMarket(market: KalshiMarket): string | null {
  const searchText = `${market.title} ${market.subtitle ?? ""}`.toLowerCase();

  for (const word of WORDS) {
    if (searchText.includes(word.toLowerCase())) {
      return word;
    }
  }

  return null;
}

function extractPrice(market: KalshiMarket): number {
  // Kalshi prices are in cents (0-99), convert to 0-1
  const rawPrice =
    market.yes_ask ?? market.yes_bid ?? market.last_price ?? null;

  if (rawPrice === null) return 0;

  // If price looks like it's already 0-1 range, use as-is; otherwise divide by 100
  return rawPrice > 1 ? rawPrice / 100 : rawPrice;
}

function credentialsPresent(): boolean {
  if (!KALSHI_PRIVATE_KEY || !KALSHI_KEY_ID) {
    console.error(
      "Kalshi credentials missing: KALSHI_API_KEY_ID and/or KALSHI_PRIVATE_KEY are not set. " +
        "Market data will not be available until these environment variables are configured."
    );
    return false;
  }
  return true;
}

async function fetchMarkets(statuses: string[]): Promise<KalshiMarket[]> {
  const apiPath = "/trade-api/v2/markets";
  const all: KalshiMarket[] = [];

  for (const status of statuses) {
    const queryParams = new URLSearchParams({ status, limit: "200" });
    const authHeaders = generateAuthHeaders("GET", apiPath);

    const response = await fetch(
      `${KALSHI_BASE_URL}${apiPath}?${queryParams.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Kalshi API error ${response.status}: ${text.slice(0, 200)}`
      );
    }

    const data = await response.json();
    all.push(...((data.markets ?? []) as KalshiMarket[]));
  }

  return all;
}

function isMrbeastMarket(m: KalshiMarket): boolean {
  const text = `${m.ticker} ${m.title} ${m.subtitle ?? ""}`.toLowerCase();
  return text.includes("mrbeast") || text.includes("mr beast");
}

export async function fetchKalshiWordPrices(): Promise<KalshiMarketPrice[]> {
  if (!credentialsPresent()) return [];

  const markets = await fetchMarkets(["open"]);
  const mrbeastMarkets = markets.filter(isMrbeastMarket);

  const wordPriceMap = new Map<string, KalshiMarketPrice>();

  for (const market of mrbeastMarkets) {
    const word = extractWordFromMarket(market);
    if (!word) continue;

    const price = extractPrice(market);

    // If multiple markets match the same word, keep the one with the highest
    // activity (prefer yes_ask over last_price)
    if (!wordPriceMap.has(word)) {
      wordPriceMap.set(word, {
        word,
        ticker: market.ticker,
        title: market.title,
        price,
      });
    }
  }

  return Array.from(wordPriceMap.values());
}

/**
 * Fetches metadata (open_time, close_time, status) for MrBeast markets,
 * including both currently open and recently closed markets.
 */
export async function fetchKalshiMarketMetadata(): Promise<
  KalshiMarketMetadata[]
> {
  if (!credentialsPresent()) return [];

  const markets = await fetchMarkets(["open", "closed"]);
  return markets
    .filter(isMrbeastMarket)
    .map((m) => ({
      ticker: m.ticker,
      title: m.title,
      status: m.status ?? "unknown",
      open_time: m.open_time,
      close_time: m.close_time,
      result: m.result,
    }));
}

/**
 * Fetches resolved/finalized MrBeast markets so the UI can display results
 * alongside original BUY/WAIT recommendations.
 */
export async function fetchKalshiMarketResults(): Promise<
  KalshiMarketMetadata[]
> {
  if (!credentialsPresent()) return [];

  const markets = await fetchMarkets(["finalized"]);
  return markets
    .filter(isMrbeastMarket)
    .map((m) => ({
      ticker: m.ticker,
      title: m.title,
      status: m.status ?? "finalized",
      open_time: m.open_time,
      close_time: m.close_time,
      result: m.result,
    }));
}
