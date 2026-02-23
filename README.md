<p align="center">
  <img src="https://cards.scryfall.io/art_crop/front/f/2/f2611d1a-4571-4ae9-8e93-dab5fc6e9942.jpg?1562443557" alt="Mystic Tutor" width="400">
</p>

<h1 align="center">Mystic Tutor MCP</h1>

<p align="center">
  <strong>Magic: The Gathering card data at your AI's fingertips</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mystic-tutor-mcp"><img src="https://img.shields.io/npm/v/mystic-tutor-mcp?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/mystic-tutor-mcp"><img src="https://img.shields.io/npm/dm/mystic-tutor-mcp?style=flat-square" alt="npm downloads"></a>
  <a href="https://github.com/Abbabon/mystic-tutor-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-8A2BE2?style=flat-square" alt="MCP Compatible"></a>
  <a href="https://scryfall.com"><img src="https://img.shields.io/badge/powered%20by-Scryfall-orange?style=flat-square" alt="Powered by Scryfall"></a>
</p>

<p align="center">
  A <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server that gives Claude (or any MCP client) real-time access to Magic: The Gathering card data, prices, rulings, synergies, and more — powered by the <a href="https://scryfall.com/docs/api">Scryfall API</a>.
</p>

---

## What can it do?

| Tool | Description |
|---|---|
| `get_card` | Look up any card by name (fuzzy matching). Returns mana cost, oracle text, prices, legalities, and more. |
| `search_cards` | Full [Scryfall search syntax](https://scryfall.com/docs/syntax) — find cards by type, color, CMC, keywords, set, etc. |
| `get_card_rulings` | Official WotC rulings for any card. |
| `find_synergies` | Smart synergy finder — analyzes a card's mechanics and finds complementary cards using Scryfall's community tags. |
| `find_similar` | Find similar cards by function, stats, type, or overall characteristics. |

## Quick Start

### Claude Code

```bash
claude mcp add --transport stdio mystic-tutor -- npx mystic-tutor-mcp
```

That's it. Restart Claude Code and start asking about cards.

### Claude Desktop

Add to your `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "mystic-tutor": {
      "command": "npx",
      "args": ["-y", "mystic-tutor-mcp"]
    }
  }
}
```

### From source

```bash
git clone https://github.com/Abbabon/mystic-tutor-mcp.git
cd mystic-tutor-mcp
npm install && npm run build && npm link
claude mcp add --transport stdio mystic-tutor -- npx mystic-tutor-mcp
```

## Examples

### Card lookup
> **You:** What does Rhystic Study do and how much is it?

```
## Rhystic Study
Mana Cost: {2}{U}  |  CMC: 3
Type: Enchantment
Oracle Text: Whenever an opponent casts a spell, you may draw a card
unless that player pays {1}.
Prices: USD $6.50 | Foil $7.99
Legalities: Commander: legal | Legacy: legal | Modern: not_legal
EDHREC Rank: 3
```

### Scryfall search
> **You:** Find me cheap green creatures with flash that are legal in modern

The tool runs: `search_cards` with query `t:creature c:green keyword:flash f:modern` sorted by price.

### Synergies
> **You:** What synergizes with Doubling Season in Sultai colors?

The tool detects **token** and **counter** themes, then searches for:
- `otag:synergy-tokens ci<=BUG f:commander`
- `otag:counters-matter ci<=BUG f:commander`

Returns top synergy cards grouped by theme.

### Similar cards
> **You:** What cards are similar to Lightning Bolt?

The tool decomposes Lightning Bolt's mechanics (`o:"deals" o:"damage"`, `t:instant`, `mv=1`) and finds comparable burn spells.

### Rulings
> **You:** What are the rulings on Panharmonicon?

Returns the card's oracle text plus all official WotC rulings with dates.

### Price check a product
> **You:** How much are the cards in [this Secret Lair] worth?

Claude fetches the product page, extracts card names, then calls `get_card` for each to compare total card value against the product price.

## How it works

```
Claude ←→ stdio ←→ Mystic Tutor MCP ←→ Scryfall API
```

- **Transport**: stdio (standard MCP protocol)
- **Data source**: [Scryfall API](https://scryfall.com/docs/api) (free, no API key needed)
- **Rate limiting**: 100ms minimum between Scryfall requests (per their guidelines)
- **Synergy engine**: Uses Scryfall's `otag:` community synergy tags + oracle text pattern analysis
- **Response format**: Structured text optimized for LLM consumption

## Requirements

- Node.js 18+
- An MCP-compatible client (Claude Code, Claude Desktop, or any MCP client)

## Roadmap

- [ ] Deck parsing and analysis (mana curve, color distribution)
- [ ] Bundled comprehensive rules (`lookup_rule`, `search_rules`)
- [ ] EDHREC integration for commander recommendations
- [ ] Price comparison across printings
- [ ] In-memory caching for repeated lookups

## Credits

- Card data powered by [Scryfall](https://scryfall.com)
- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by [pato/mtg-mcp](https://github.com/pato/mtg-mcp) and [ericraio/mtg-mcp](https://github.com/ericraio/mtg-mcp)
- Header art: [Mystic Tutor](https://scryfall.com/card/ss1/4/mystic-tutor) by Lindsey Look

## License

MIT
