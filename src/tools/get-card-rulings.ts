import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScryfallClient } from "../api/scryfall-client.js";
import { formatRulings } from "../utils/format-card.js";

export function registerGetCardRulings(
  server: McpServer,
  client: ScryfallClient
): void {
  server.tool(
    "get_card_rulings",
    "Get official WotC rulings for a Magic: The Gathering card. Returns the card's oracle text plus all published rulings.",
    {
      name: z
        .string()
        .describe("Card name to get rulings for (fuzzy matching supported)"),
    },
    async ({ name }) => {
      try {
        // First look up the card to get its ID
        const card = await client.getCardByName(name);
        // Then fetch rulings
        const rulings = await client.getCardRulings(card.id);

        return {
          content: [
            {
              type: "text" as const,
              text: formatRulings(card, rulings.data),
            },
          ],
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error fetching rulings";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
