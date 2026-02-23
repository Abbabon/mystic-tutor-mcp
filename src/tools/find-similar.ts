import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScryfallClient } from "../api/scryfall-client.js";
import type { ScryfallCard } from "../api/types.js";
import { formatCardCompact } from "../utils/format-card.js";

/** Extract key mechanical phrases from oracle text for function-based similarity */
function extractMechanicalPhrases(oracleText: string): string[] {
  const patterns: { regex: RegExp; query: string }[] = [
    { regex: /\bdestroy target\b/i, query: 'o:"destroy target"' },
    { regex: /\bexile target\b/i, query: 'o:"exile target"' },
    { regex: /\bdeal[s]? \d+ damage\b/i, query: 'o:"deals" o:"damage"' },
    { regex: /\bdraw a card\b/i, query: 'o:"draw a card"' },
    { regex: /\bdraw \w+ cards\b/i, query: 'o:"draw" o:"cards"' },
    { regex: /\bcreate[s]? .* token/i, query: 'o:"create" o:"token"' },
    { regex: /\bcounter target\b/i, query: 'o:"counter target"' },
    { regex: /\bsearch your library\b/i, query: 'o:"search your library"' },
    { regex: /\breturn .* from .* graveyard\b/i, query: 'o:"return" o:"graveyard"' },
    { regex: /\bdiscard\b/i, query: 'o:"discard"' },
    { regex: /\bgain.*life\b/i, query: 'o:"gain" o:"life"' },
    { regex: /\blose.*life\b/i, query: 'o:"lose" o:"life"' },
    { regex: /\bcan't be blocked\b/i, query: 'o:"can\'t be blocked"' },
    { regex: /\bflash\b/i, query: "keyword:flash" },
    { regex: /\bflying\b/i, query: "keyword:flying" },
    { regex: /\btrample\b/i, query: "keyword:trample" },
    { regex: /\bdeathtouch\b/i, query: "keyword:deathtouch" },
    { regex: /\bhaste\b/i, query: "keyword:haste" },
    { regex: /\bvigilance\b/i, query: "keyword:vigilance" },
    { regex: /\blifelink\b/i, query: "keyword:lifelink" },
    {
      regex: /\+1\/\+1 counter/i,
      query: 'o:"+1/+1 counter"',
    },
    { regex: /\bmill\b/i, query: 'o:"mill"' },
  ];

  return patterns
    .filter((p) => p.regex.test(oracleText))
    .map((p) => p.query);
}

/** Get oracle text from a card, handling double-faced cards */
function getFullOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text;
  if (!card.card_faces) return "";
  return card.card_faces.map((f) => f.oracle_text ?? "").join("\n");
}

/** Extract creature subtypes from type_line */
function getSubtypes(typeLine: string): string[] {
  const parts = typeLine.split("—");
  if (parts.length < 2) return [];
  return parts[1]
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
}

/** Extract supertypes/card types from type_line (before the dash) */
function getCardTypes(typeLine: string): string[] {
  const before = typeLine.split("—")[0].trim();
  return before
    .split(/\s+/)
    .filter(
      (w) => !["Legendary", "Snow", "Basic", "World", "Token"].includes(w)
    )
    .map((w) => w.toLowerCase());
}

export function registerFindSimilar(
  server: McpServer,
  client: ScryfallClient
): void {
  server.tool(
    "find_similar",
    "Find cards similar to a given Magic: The Gathering card. Can match by overall characteristics, function (effects), stats (CMC/power/toughness), or type (creature types, card types).",
    {
      card_name: z.string().describe("Card name to find similar cards for"),
      criteria: z
        .enum(["overall", "function", "stats", "type"])
        .optional()
        .default("overall")
        .describe(
          "Similarity criteria: 'overall' (balanced), 'function' (same effects), 'stats' (same CMC/P/T), 'type' (same types)"
        ),
      color_identity: z
        .string()
        .optional()
        .describe("Color identity constraint (e.g., 'wubrg', 'bg')"),
      format: z
        .string()
        .optional()
        .default("commander")
        .describe("Format legality filter"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of similar cards to return (1-25)"),
    },
    async ({ card_name, criteria, color_identity, format, limit }) => {
      try {
        const clampedLimit = Math.max(1, Math.min(25, limit));

        // Fetch the source card
        const card = await client.getCardByName(card_name);
        const oracleText = getFullOracleText(card);
        const cardTypes = getCardTypes(card.type_line ?? "");
        const subtypes = getSubtypes(card.type_line ?? "");

        // Build color identity filter
        let ciFilter = "";
        if (color_identity) {
          ciFilter = ` ci<=${color_identity.toUpperCase()}`;
        }

        const exclude = ` -!"${card.name}"`;
        const formatFilter = ` f:${format}`;

        let queryParts: string[] = [];
        let searchDescription = "";

        switch (criteria) {
          case "function": {
            const phrases = extractMechanicalPhrases(oracleText);
            if (phrases.length > 0) {
              // Use top 2-3 mechanical phrases
              queryParts = phrases.slice(0, 3);
              searchDescription = "matching effects/mechanics";
            } else {
              // Fallback to card type
              queryParts = cardTypes.map((t) => `t:${t}`);
              searchDescription = "same card type (no distinct mechanics detected)";
            }
            break;
          }

          case "stats": {
            const cmc = card.cmc;
            queryParts.push(`mv>=${Math.max(0, cmc - 1)} mv<=${cmc + 1}`);
            if (card.power && card.toughness) {
              const pow = parseInt(card.power, 10);
              const tough = parseInt(card.toughness, 10);
              if (!isNaN(pow))
                queryParts.push(
                  `pow>=${Math.max(0, pow - 1)} pow<=${pow + 1}`
                );
              if (!isNaN(tough))
                queryParts.push(
                  `tou>=${Math.max(0, tough - 1)} tou<=${tough + 1}`
                );
            }
            // Add card type to keep results relevant
            if (cardTypes.length > 0) queryParts.push(`t:${cardTypes[0]}`);
            searchDescription = `similar stats (CMC ~${card.cmc}${card.power ? `, P/T ~${card.power}/${card.toughness}` : ""})`;
            break;
          }

          case "type": {
            queryParts = cardTypes.map((t) => `t:${t}`);
            if (subtypes.length > 0) {
              // Add subtypes with OR logic for flexibility
              queryParts.push(
                `(${subtypes.map((s) => `t:${s.toLowerCase()}`).join(" OR ")})`
              );
            }
            searchDescription = `same type (${card.type_line})`;
            break;
          }

          case "overall":
          default: {
            // Combine type + CMC range + 1 keyword if available
            if (cardTypes.length > 0) queryParts.push(`t:${cardTypes[0]}`);
            const cmc = card.cmc;
            queryParts.push(`mv>=${Math.max(0, cmc - 1)} mv<=${cmc + 1}`);
            // Add one mechanical phrase if available
            const phrases = extractMechanicalPhrases(oracleText);
            if (phrases.length > 0) queryParts.push(phrases[0]);
            searchDescription = "overall similarity";
            break;
          }
        }

        const query =
          queryParts.join(" ") + ciFilter + formatFilter + exclude;

        const results = await client.searchCards(query, { order: "edhrec" });
        let cards = results.data.slice(0, clampedLimit);

        // If too few results, try a relaxed search (drop the last constraint)
        if (cards.length < 3 && queryParts.length > 1) {
          const relaxedQuery =
            queryParts.slice(0, -1).join(" ") +
            ciFilter +
            formatFilter +
            exclude;
          try {
            const relaxedResults = await client.searchCards(relaxedQuery, {
              order: "edhrec",
            });
            if (relaxedResults.data.length > cards.length) {
              cards = relaxedResults.data.slice(0, clampedLimit);
            }
          } catch {
            // Keep original results if relaxed search also fails
          }
        }

        const lines: string[] = [];
        lines.push(`## Cards Similar to ${card.name}`);
        lines.push(`**Criteria**: ${searchDescription}`);
        if (color_identity)
          lines.push(`**Color Identity**: ${color_identity.toUpperCase()}`);
        lines.push(`**Format**: ${format}`);
        lines.push(`Found ${results.total_cards} matches (showing ${cards.length})\n`);

        for (let i = 0; i < cards.length; i++) {
          lines.push(`${i + 1}. ${formatCardCompact(cards[i])}\n`);
        }

        if (cards.length === 0) {
          lines.push(
            "No similar cards found with these criteria. Try broadening the search with different criteria or removing the color identity constraint."
          );
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error finding similar cards";
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
