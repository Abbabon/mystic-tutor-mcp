import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScryfallClient } from "../api/scryfall-client.js";
import type { ScryfallCard } from "../api/types.js";
import { formatCardCompact } from "../utils/format-card.js";

/**
 * Mapping from oracle text patterns to Scryfall search queries.
 * Uses otag (community-curated synergy tags) where available,
 * falls back to oracle text searches.
 */
const SYNERGY_PATTERNS: {
  label: string;
  test: (card: ScryfallCard, oracleText: string) => boolean;
  queries: string[];
}[] = [
  {
    label: "Token Synergies",
    test: (_, text) => /\btoken/i.test(text) || /\bcreate\b/i.test(text),
    queries: ["otag:synergy-tokens"],
  },
  {
    label: "+1/+1 Counter Synergies",
    test: (_, text) => /\+1\/\+1 counter/i.test(text),
    queries: ["otag:counters-matter"],
  },
  {
    label: "Graveyard Synergies",
    test: (_, text) =>
      /\bgraveyard\b/i.test(text) || /\bmill\b/i.test(text),
    queries: ["otag:graveyard-matters"],
  },
  {
    label: "Sacrifice Synergies",
    test: (_, text) => /\bsacrifice\b/i.test(text),
    queries: ["otag:sacrifice-matters"],
  },
  {
    label: "Lifegain Synergies",
    test: (_, text) => /\bgain.*life\b/i.test(text) || /\blifelink\b/i.test(text),
    queries: ['otag:lifegain-matters'],
  },
  {
    label: "Equipment Synergies",
    test: (card, text) =>
      /\bequip\b/i.test(text) || card.type_line?.includes("Equipment"),
    queries: ["otag:equipment-matters"],
  },
  {
    label: "Enchantment Synergies",
    test: (card, _) => card.type_line?.includes("Enchantment") ?? false,
    queries: ["otag:enchantments-matter"],
  },
  {
    label: "Artifact Synergies",
    test: (card, _) =>
      (card.type_line?.includes("Artifact") ?? false) &&
      !(card.type_line?.includes("Equipment") ?? false),
    queries: ["otag:artifacts-matter"],
  },
  {
    label: "Card Draw Synergies",
    test: (_, text) => /\bdraw a card\b/i.test(text) || /\bdraw cards\b/i.test(text),
    queries: ['o:"whenever" o:"draw"'],
  },
  {
    label: "Enters the Battlefield Synergies",
    test: (_, text) => /\benters\b/i.test(text) && /\bbattlefield\b/i.test(text),
    queries: ['otag:etb-matters'],
  },
  {
    label: "Spell Cast Synergies",
    test: (_, text) => /\bwhenever you cast\b/i.test(text) || /\bmagecraft\b/i.test(text),
    queries: ['otag:spellcast-matters'],
  },
  {
    label: "Planeswalker Synergies",
    test: (card, _) => card.type_line?.includes("Planeswalker") ?? false,
    queries: ['otag:planeswalkers-matter'],
  },
];

/** Get oracle text from a card, handling double-faced cards */
function getFullOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text;
  if (!card.card_faces) return "";
  return card.card_faces.map((f) => f.oracle_text ?? "").join("\n");
}

export function registerFindSynergies(
  server: McpServer,
  client: ScryfallClient
): void {
  server.tool(
    "find_synergies",
    "Find cards that synergize with a given Magic: The Gathering card. Analyzes the card's mechanics and searches for complementary cards using Scryfall's community synergy tags.",
    {
      card_name: z.string().describe("Card name to find synergies for"),
      color_identity: z
        .string()
        .optional()
        .describe(
          "Color identity constraint (e.g., 'wubrg', 'bg', 'rg'). Limits results to cards within these colors."
        ),
      format: z
        .string()
        .optional()
        .default("commander")
        .describe("Format legality filter (e.g., 'commander', 'modern')"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of synergy cards to return per theme (1-25)"),
    },
    async ({ card_name, color_identity, format, limit }) => {
      try {
        const clampedLimit = Math.max(1, Math.min(25, limit));

        // Fetch the source card
        const card = await client.getCardByName(card_name);
        const oracleText = getFullOracleText(card);

        // Detect synergy themes
        const matchedThemes = SYNERGY_PATTERNS.filter((p) =>
          p.test(card, oracleText)
        );

        if (matchedThemes.length === 0) {
          // Fallback: search by card type + keywords
          const typeSearch = card.type_line
            ?.split("—")[0]
            ?.trim()
            .split(" ")
            .filter(
              (w) =>
                !["Legendary", "Snow", "Basic", "World", "Token"].includes(w)
            )
            .map((w) => `t:${w.toLowerCase()}`)
            .join(" ");

          const fallbackQuery = `${typeSearch ?? ""} f:${format} -!"${card.name}"`;
          const results = await client.searchCards(fallbackQuery, {
            order: "edhrec",
          });

          const cards = results.data.slice(0, clampedLimit);
          const lines: string[] = [];
          lines.push(`## Synergies for ${card.name}`);
          lines.push(
            `No specific mechanical synergies detected. Showing popular cards of the same type.\n`
          );
          for (let i = 0; i < cards.length; i++) {
            lines.push(`${i + 1}. ${formatCardCompact(cards[i])}\n`);
          }
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        }

        // Build color identity filter
        let ciFilter = "";
        if (color_identity) {
          const colors = color_identity.toUpperCase().split("");
          ciFilter = ` ci<=${colors.join("")}`;
        }

        // Search for synergies per theme (max 3 themes to stay within rate limits)
        const themesToSearch = matchedThemes.slice(0, 3);
        const lines: string[] = [];
        lines.push(`## Synergies for ${card.name}`);
        lines.push(
          `**Detected Themes**: ${matchedThemes.map((t) => t.label).join(", ")}`
        );
        if (color_identity) lines.push(`**Color Identity**: ${color_identity.toUpperCase()}`);
        lines.push(`**Format**: ${format}\n`);

        for (const theme of themesToSearch) {
          const query = `${theme.queries[0]}${ciFilter} f:${format} -!"${card.name}"`;
          try {
            const results = await client.searchCards(query, {
              order: "edhrec",
            });
            const cards = results.data.slice(0, clampedLimit);

            lines.push(`### ${theme.label}`);
            if (cards.length === 0) {
              lines.push("No results found for this theme.\n");
            } else {
              for (let i = 0; i < cards.length; i++) {
                lines.push(`${i + 1}. ${formatCardCompact(cards[i])}\n`);
              }
            }
          } catch {
            lines.push(`### ${theme.label}`);
            lines.push("Search failed for this theme.\n");
          }
        }

        if (matchedThemes.length > 3) {
          lines.push(
            `*Additional themes detected but not searched: ${matchedThemes
              .slice(3)
              .map((t) => t.label)
              .join(", ")}*`
          );
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error finding synergies";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
