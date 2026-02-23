# MCP Server

## Purpose

Core server setup, tool registration, and stdio transport for the Mystic Tutor MCP server.

## Requirements

### Requirement: Server Identity

The server MUST identify itself as `mystic-tutor` version `1.0.0` when connecting to MCP clients.

### Requirement: Stdio Transport

The server MUST communicate via the MCP stdio transport (stdin/stdout).

#### Scenario: Server startup

- GIVEN the server process is launched
- WHEN the MCP transport connects
- THEN the server logs "Mystic Tutor MCP server running on stdio" to stderr
- AND the server is ready to accept tool calls

### Requirement: Tool Registration

The server MUST register all five tools on startup: `get_card`, `search_cards`, `get_card_rulings`, `find_synergies`, and `find_similar`.

#### Scenario: All tools available

- GIVEN the server has started
- WHEN a client lists available tools
- THEN all five tools are listed with their descriptions and input schemas

### Requirement: Shared Client Instance

All tools MUST share a single `ScryfallClient` instance (and its rate limiter) to enforce global rate limiting.

### Requirement: No Console.log

The server MUST NOT use `console.log()` anywhere in the codebase, as it corrupts the stdio MCP transport. All logging MUST use `console.error()`.

### Requirement: Fatal Error Handling

The server MUST exit with code 1 if the main startup function throws an unhandled error.

#### Scenario: Startup failure

- GIVEN the server encounters a fatal error during initialization
- WHEN the error is caught by the top-level handler
- THEN the error is logged to stderr
- AND the process exits with code 1
