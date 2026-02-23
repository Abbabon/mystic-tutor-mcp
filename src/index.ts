#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ScryfallClient } from "./api/scryfall-client.js";
import { registerGetCard } from "./tools/get-card.js";
import { registerSearchCards } from "./tools/search-cards.js";
import { registerGetCardRulings } from "./tools/get-card-rulings.js";
import { registerFindSynergies } from "./tools/find-synergies.js";
import { registerFindSimilar } from "./tools/find-similar.js";

const server = new McpServer({
  name: "mystic-tutor",
  version: "1.0.0",
});

const scryfallClient = new ScryfallClient({
  userAgent: "mystic-tutor-mcp/1.0.0",
  minRequestInterval: 100,
});

registerGetCard(server, scryfallClient);
registerSearchCards(server, scryfallClient);
registerGetCardRulings(server, scryfallClient);
registerFindSynergies(server, scryfallClient);
registerFindSimilar(server, scryfallClient);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mystic Tutor MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
