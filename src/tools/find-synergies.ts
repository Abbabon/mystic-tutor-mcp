import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScryfallClient } from "../api/scryfall-client.js";
import type { ScryfallCard } from "../api/types.js";
import { formatCardCompact } from "../utils/format-card.js";

/**
 * Verified otag names from Scryfall's community tagging system.
 * Each entry has a primary otag query and an oracle text fallback.
 */
const SYNERGY_PATTERNS: {
  label: string;
  test: (card: ScryfallCard, oracleText: string) => boolean;
  queries: string[];
}[] = [
  {
    label: "Token Synergies",
    test: (_, text) => /\btoken/i.test(text) || /\bcreate\b/i.test(text),
    queries: ["otag:token-doubler", 'o:"token" o:"create"'],
  },
  {
    label: "+1/+1 Counter Synergies",
    test: (_, text) =>
      /\+1\/\+1 counter/i.test(text) || /\bproliferate\b/i.test(text),
    queries: ["otag:counters-matter"],
  },
  {
    label: "Graveyard Synergies",
    test: (_, text) => /\bgraveyard\b/i.test(text),
    queries: ["otag:death-trigger", 'o:"graveyard"'],
  },
  {
    label: "Mill Synergies",
    test: (_, text) => /\bmill\b/i.test(text),
    queries: ["otag:mill"],
  },
  {
    label: "Sacrifice Synergies",
    test: (_, text) => /\bsacrifice\b/i.test(text),
    queries: ["otag:sacrifice-outlet"],
  },
  {
    label: "Lifegain Synergies",
    test: (_, text) => /\bgain.*life\b/i.test(text) || /\blifelink\b/i.test(text),
    queries: ["otag:lifegain"],
  },
  {
    label: "Blink / Flicker Synergies",
    test: (_, text) => /\benters\b/i.test(text) && /\bbattlefield\b/i.test(text),
    queries: ["otag:flicker"],
  },
  {
    label: "Card Draw Synergies",
    test: (_, text) => /\bdraw a card\b/i.test(text) || /\bdraw cards\b/i.test(text),
    queries: ["otag:draw"],
  },
  {
    label: "Ramp Synergies",
    test: (_, text) =>
      /\bsearch your library for a.*land\b/i.test(text) || /\badd\b.*\bmana\b/i.test(text),
    queries: ["otag:ramp"],
  },
  {
    label: "Landfall Synergies",
    test: (_, text) => /\blandfall\b/i.test(text) || /\bwhenever a land enters\b/i.test(text),
    queries: ["otag:landfall"],
  },
  {
    label: "Enchantment Synergies",
    test: (card, _) => card.type_line?.includes("Enchantment") ?? false,
    queries: ['otag:enchantress', 'o:"enchantment" o:"whenever"'],
  },
  {
    label: "Removal",
    test: (_, text) =>
      /\bdestroy target\b/i.test(text) || /\bexile target\b/i.test(text),
    queries: ["otag:removal"],
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
          let cards: ScryfallCard[] = [];

          // Try each query in order until one returns results
          for (const q of theme.queries) {
            const query = `${q}${ciFilter} f:${format} -!"${card.name}"`;
            try {
              const results = await client.searchCards(query, {
                order: "edhrec",
              });
              cards = results.data.slice(0, clampedLimit);
              if (cards.length > 0) break;
            } catch {
              // Try next query
            }
          }

          lines.push(`### ${theme.label}`);
          if (cards.length === 0) {
            lines.push("No results found for this theme.\n");
          } else {
            for (let i = 0; i < cards.length; i++) {
              lines.push(`${i + 1}. ${formatCardCompact(cards[i])}\n`);
            }
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
