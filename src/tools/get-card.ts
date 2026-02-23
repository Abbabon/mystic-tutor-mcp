import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScryfallClient } from "../api/scryfall-client.js";
import { formatCard } from "../utils/format-card.js";

export function registerGetCard(
  server: McpServer,
  client: ScryfallClient
): void {
  server.tool(
    "get_card",
    "Look up a Magic: The Gathering card by name. Returns mana cost, oracle text, prices, legalities, and more.",
    {
      name: z.string().describe("Card name (fuzzy matching supported)"),
      exact: z
        .boolean()
        .optional()
        .default(false)
        .describe("Use exact name match instead of fuzzy"),
    },
    async ({ name, exact }) => {
      try {
        const card = await client.getCardByName(name, exact);
        return { content: [{ type: "text" as const, text: formatCard(card) }] };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error looking up card";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
