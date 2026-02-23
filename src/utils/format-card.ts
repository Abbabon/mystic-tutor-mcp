import type { ScryfallCard, ScryfallCardFace, ScryfallRuling } from "../api/types.js";

/** Get oracle text, handling double-faced cards */
function getOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text;
  if (!card.card_faces) return "(no oracle text)";
  return card.card_faces
    .map((f) => `// ${f.name} //\n${f.oracle_text ?? ""}`)
    .join("\n\n");
}

/** Get mana cost, handling double-faced cards */
function getManaCost(card: ScryfallCard): string {
  if (card.mana_cost) return card.mana_cost;
  if (!card.card_faces) return "";
  return card.card_faces
    .map((f) => f.mana_cost ?? "")
    .filter(Boolean)
    .join(" // ");
}

/** Get type line, handling double-faced cards */
function getTypeLine(card: ScryfallCard): string {
  if (card.type_line) return card.type_line;
  if (!card.card_faces) return "";
  return card.card_faces
    .map((f) => f.type_line ?? "")
    .filter(Boolean)
    .join(" // ");
}

/** Format legalities, showing only key formats */
function formatLegalities(legalities: Record<string, string>): string {
  const formats = [
    "standard",
    "pioneer",
    "modern",
    "legacy",
    "vintage",
    "commander",
    "pauper",
  ];
  return formats
    .map((f) => {
      const status = legalities[f] ?? "unknown";
      const label = f.charAt(0).toUpperCase() + f.slice(1);
      return `${label}: ${status}`;
    })
    .join(" | ");
}

/** Format prices */
function formatPrices(prices: Record<string, string | null>): string {
  const parts: string[] = [];
  if (prices.usd) parts.push(`USD $${prices.usd}`);
  if (prices.usd_foil) parts.push(`Foil $${prices.usd_foil}`);
  if (prices.eur) parts.push(`EUR €${prices.eur}`);
  if (prices.tix) parts.push(`TIX ${prices.tix}`);
  return parts.length > 0 ? parts.join(" | ") : "No price data";
}

/** Get image URI (prefer normal size) */
function getImageUri(card: ScryfallCard): string | null {
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris?.normal)
    return card.card_faces[0].image_uris.normal;
  return null;
}

/** Verbose card format for get_card */
export function formatCard(card: ScryfallCard): string {
  const lines: string[] = [];
  const manaCost = getManaCost(card);
  const typeLine = getTypeLine(card);

  lines.push(`## ${card.name}`);
  lines.push(
    `**Mana Cost**: ${manaCost || "(none)"}  |  **CMC**: ${card.cmc}`
  );
  lines.push(`**Type**: ${typeLine}`);
  lines.push(`**Oracle Text**: ${getOracleText(card)}`);

  if (card.colors?.length)
    lines.push(`**Colors**: ${card.colors.join(", ")}`);
  if (card.color_identity?.length)
    lines.push(`**Color Identity**: ${card.color_identity.join("")}`);
  if (card.keywords?.length)
    lines.push(`**Keywords**: ${card.keywords.join(", ")}`);

  // Power/toughness or loyalty
  if (card.power && card.toughness)
    lines.push(`**P/T**: ${card.power}/${card.toughness}`);
  if (card.loyalty) lines.push(`**Loyalty**: ${card.loyalty}`);

  lines.push(`**Legalities**: ${formatLegalities(card.legalities)}`);
  lines.push(`**Prices**: ${formatPrices(card.prices)}`);
  lines.push(
    `**Set**: ${card.set_name} (${card.set.toUpperCase()})  |  **Rarity**: ${card.rarity}`
  );

  if (card.edhrec_rank != null)
    lines.push(`**EDHREC Rank**: ${card.edhrec_rank}`);

  const imageUri = getImageUri(card);
  if (imageUri) lines.push(`**Image**: ${imageUri}`);

  lines.push(`**Scryfall**: ${card.scryfall_uri}`);

  return lines.join("\n");
}

/** Compact card format for search result lists */
export function formatCardCompact(card: ScryfallCard): string {
  const manaCost = getManaCost(card);
  const typeLine = getTypeLine(card);
  const oracleText = getOracleText(card);
  const price = card.prices.usd ? `USD $${card.prices.usd}` : "";

  const lines: string[] = [];
  lines.push(
    `**${card.name}** ${manaCost || ""} | ${typeLine}`
  );

  // Truncate oracle text for compact view
  const maxLen = 200;
  const truncated =
    oracleText.length > maxLen
      ? oracleText.slice(0, maxLen) + "..."
      : oracleText;
  lines.push(truncated);

  const meta: string[] = [];
  if (price) meta.push(price);
  if (card.edhrec_rank != null) meta.push(`EDHREC #${card.edhrec_rank}`);
  if (card.rarity) meta.push(card.rarity);
  if (meta.length) lines.push(meta.join(" | "));

  return lines.join("\n");
}

/** Format rulings for a card */
export function formatRulings(
  card: ScryfallCard,
  rulings: ScryfallRuling[]
): string {
  const lines: string[] = [];
  const manaCost = getManaCost(card);

  lines.push(`## Rulings for ${card.name}`);
  lines.push(
    `**Card**: ${card.name} (${manaCost || "no cost"}) - ${card.type_line}`
  );
  lines.push(`**Oracle Text**: ${getOracleText(card)}`);
  lines.push("");

  if (rulings.length === 0) {
    lines.push("No official rulings found for this card.");
  } else {
    lines.push(`### Official Rulings (${rulings.length}):`);
    for (let i = 0; i < rulings.length; i++) {
      const r = rulings[i];
      lines.push(`${i + 1}. (${r.published_at}, ${r.source}) ${r.comment}`);
    }
  }

  return lines.join("\n");
}
