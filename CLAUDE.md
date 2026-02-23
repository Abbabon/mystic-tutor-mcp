# Mystic Tutor MCP

A Model Context Protocol (MCP) server that provides Magic: The Gathering card data via the Scryfall API.

## Build & Run

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript -> dist/
npm link             # Make `npx mystic-tutor-mcp` work locally
npm run dev          # Watch mode (auto-recompile on changes)
npm start            # Run the server directly
```

After changes, always rebuild: `npm run build`

## Register with Claude Code

```bash
claude mcp add --transport stdio mystic-tutor -- npx mystic-tutor-mcp
```

## Architecture

```
src/
├── index.ts              # Entry point: creates McpServer, registers tools, connects stdio
├── api/
│   ├── types.ts          # Scryfall API response interfaces
│   └── scryfall-client.ts # Rate-limited HTTP client (Node fetch, 100ms gap)
├── utils/
│   ├── rate-limiter.ts   # Simple time-based rate limiter
│   └── format-card.ts    # Card -> LLM-friendly text (verbose + compact modes)
└── tools/
    ├── get-card.ts           # Fuzzy/exact card lookup
    ├── search-cards.ts       # Scryfall syntax search
    ├── get-card-rulings.ts   # Official WotC rulings
    ├── find-synergies.ts     # Synergy finder (otag-based)
    └── find-similar.ts       # Similar card finder (attribute decomposition)
```

### Key patterns

- Each tool file exports a `register*` function that calls `server.tool()`
- All tools share a single `ScryfallClient` instance (and its rate limiter)
- Card formatting handles double-faced cards (MDFCs, transform) where oracle_text lives on `card_faces`
- `find_synergies` uses Scryfall's `otag:` community synergy tags as the primary search strategy
- `find_similar` decomposes cards into searchable attributes based on the selected criteria
- All responses are structured text (not JSON) for natural LLM consumption

### Scryfall API

- Base URL: `https://api.scryfall.com`
- No API key required (public API)
- Rate limit: 100ms minimum between requests (enforced by `RateLimiter`)
- User-Agent: `mystic-tutor-mcp/1.0.0`
- Never use `console.log()` — it corrupts the stdio MCP transport. Use `console.error()` for logging.

## Tech stack

- TypeScript (ES2022 target, Node16 module resolution)
- `@modelcontextprotocol/sdk` - MCP server framework
- `zod` - Input schema validation
- Node built-in `fetch` - HTTP client (no external HTTP library)
- stdio transport - Standard MCP communication

## Adding a new tool

1. Create `src/tools/my-tool.ts` with a `registerMyTool(server, client)` function
2. Import and call it in `src/index.ts`
3. Rebuild: `npm run build`
