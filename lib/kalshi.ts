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

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  yes_ask?: number;
  yes_bid?: number;
  last_price?: number;
  status?: string;
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

export interface FetchKalshiResult {
  prices: KalshiMarketPrice[];
  /** True when we successfully contacted the Kalshi API (even if 0 MrBeast markets were returned). */
  connected: boolean;
}

export async function fetchKalshiWordPrices(): Promise<FetchKalshiResult> {
  if (!KALSHI_PRIVATE_KEY || !KALSHI_KEY_ID) {
    // Credentials not configured – treat as no markets available rather than
    // surfacing a confusing internal error to the end user.
    return { prices: [], connected: false };
  }

  const path = "/trade-api/v2/markets";
  const queryParams = new URLSearchParams({
    status: "open",
    limit: "200",
  });

  const authHeaders = generateAuthHeaders("GET", path);

  const response = await fetch(
    `${KALSHI_BASE_URL}${path}?${queryParams.toString()}`,
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
  const markets: KalshiMarket[] = data.markets ?? [];

  const mrbeastMarkets = markets.filter((m) => {
    const text = `${m.ticker} ${m.title} ${m.subtitle ?? ""}`.toLowerCase();
    return text.includes("mrbeast") || text.includes("mr beast");
  });

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

  return { prices: Array.from(wordPriceMap.values()), connected: true };
}
