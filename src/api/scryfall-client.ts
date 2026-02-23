import { RateLimiter } from "../utils/rate-limiter.js";
import type {
  ScryfallCard,
  ScryfallSearchResult,
  ScryfallRulingsResult,
  ScryfallError,
} from "./types.js";

const BASE_URL = "https://api.scryfall.com";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_SIZE = 200;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ScryfallClient {
  private rateLimiter: RateLimiter;
  private userAgent: string;
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(opts: { userAgent: string; minRequestInterval?: number }) {
    this.userAgent = opts.userAgent;
    this.rateLimiter = new RateLimiter(opts.minRequestInterval ?? 100);
  }

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  private async request<T>(path: string): Promise<T> {
    await this.rateLimiter.wait();

    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ScryfallError | null;
      const detail = body?.details ?? response.statusText;

      if (response.status === 404) {
        throw new Error(`Not found: ${detail}`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limited by Scryfall. Please wait a moment and try again.`);
      }
      throw new Error(`Scryfall API error (${response.status}): ${detail}`);
    }

    return (await response.json()) as T;
  }

  async getCardByName(name: string, exact = false): Promise<ScryfallCard> {
    const cacheKey = `card:${name.toLowerCase()}:${exact}`;
    const cached = this.getCached<ScryfallCard>(cacheKey);
    if (cached) return cached;

    const param = exact ? "exact" : "fuzzy";
    const encoded = encodeURIComponent(name);
    const card = await this.request<ScryfallCard>(`/cards/named?${param}=${encoded}`);
    this.setCache(cacheKey, card);
    return card;
  }

  async searchCards(
    query: string,
    opts: { order?: string; page?: number } = {}
  ): Promise<ScryfallSearchResult> {
    const params = new URLSearchParams({ q: query, unique: "cards" });
    if (opts.order) params.set("order", opts.order);
    if (opts.page && opts.page > 1) params.set("page", String(opts.page));
    return this.request<ScryfallSearchResult>(`/cards/search?${params}`);
  }

  async getCardRulings(cardId: string): Promise<ScryfallRulingsResult> {
    const cacheKey = `rulings:${cardId}`;
    const cached = this.getCached<ScryfallRulingsResult>(cacheKey);
    if (cached) return cached;

    const result = await this.request<ScryfallRulingsResult>(`/cards/${cardId}/rulings`);
    this.setCache(cacheKey, result);
    return result;
  }

  async fetchNextPage(url: string): Promise<ScryfallSearchResult> {
    await this.rateLimiter.wait();

    const response = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Scryfall API error (${response.status}): ${response.statusText}`);
    }

    return (await response.json()) as ScryfallSearchResult;
  }
}
