import { RateLimiter } from "../utils/rate-limiter.js";
import type {
  ScryfallCard,
  ScryfallSearchResult,
  ScryfallRulingsResult,
  ScryfallError,
} from "./types.js";

const BASE_URL = "https://api.scryfall.com";

export class ScryfallClient {
  private rateLimiter: RateLimiter;
  private userAgent: string;

  constructor(opts: { userAgent: string; minRequestInterval?: number }) {
    this.userAgent = opts.userAgent;
    this.rateLimiter = new RateLimiter(opts.minRequestInterval ?? 100);
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
    const param = exact ? "exact" : "fuzzy";
    const encoded = encodeURIComponent(name);
    return this.request<ScryfallCard>(`/cards/named?${param}=${encoded}`);
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
    return this.request<ScryfallRulingsResult>(`/cards/${cardId}/rulings`);
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
