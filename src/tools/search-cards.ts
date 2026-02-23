import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScryfallClient } from "../api/scryfall-client.js";
import { formatCardCompact } from "../utils/format-card.js";

export function registerSearchCards(
  server: McpServer,
  client: ScryfallClient
): void {
  server.tool(
    "search_cards",
    "Search for Magic: The Gathering cards using Scryfall syntax. Examples: 't:creature ci:ug mv<=3', 'o:\"draw cards\" c:blue', 'set:mkm r:mythic'.",
    {
      query: z
        .string()
        .describe(
          "Scryfall search query (e.g., 't:creature ci:ug mv<=3 keyword:flash')"
        ),
      order: z
        .enum([
          "name",
          "released",
          "rarity",
          "color",
          "usd",
          "tix",
          "eur",
          "cmc",
          "power",
          "toughness",
          "edhrec",
          "penny",
        ])
        .optional()
        .default("edhrec")
        .describe("Sort order for results"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of cards to return (1-25)"),
      format_legality: z
        .string()
        .optional()
        .describe(
          "Filter to cards legal in this format (e.g., 'commander', 'modern', 'standard')"
        ),
    },
    async ({ query, order, limit, format_legality }) => {
      try {
        const clampedLimit = Math.max(1, Math.min(25, limit));

        // Build final query with format filter
        let fullQuery = query;
        if (format_legality) {
          fullQuery += ` f:${format_legality}`;
        }

        const result = await client.searchCards(fullQuery, { order });

        // Collect cards up to limit, fetching additional pages if needed
        let cards = result.data;
        if (cards.length < clampedLimit && result.has_more && result.next_page) {
          const page2 = await client.fetchNextPage(result.next_page);
          cards = [...cards, ...page2.data];
        }
        cards = cards.slice(0, clampedLimit);

        const lines: string[] = [];
        lines.push(
          `## Search: ${query}${format_legality ? ` (format: ${format_legality})` : ""}`
        );
        lines.push(
          `Found ${result.total_cards} cards (showing ${cards.length}, sorted by ${order})\n`
        );

        for (let i = 0; i < cards.length; i++) {
          lines.push(`### ${i + 1}. ${formatCardCompact(cards[i])}`);
          lines.push("");
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error searching cards";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
