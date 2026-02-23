# Scryfall Client

## Purpose

HTTP client for the Scryfall REST API with rate limiting and in-memory caching.

## Requirements

### Requirement: Rate Limiting

The client MUST enforce a minimum 100ms gap between consecutive API requests.

#### Scenario: Rapid successive requests

- GIVEN two API calls are made in quick succession
- WHEN the second call happens less than 100ms after the first
- THEN the client delays the second request until the 100ms interval has elapsed

### Requirement: User-Agent Header

All requests MUST include the header `User-Agent: mystic-tutor-mcp/1.0.0`.

### Requirement: Accept Header

All requests MUST include the header `Accept: application/json`.

### Requirement: Base URL

All API requests MUST target `https://api.scryfall.com`.

### Requirement: In-Memory LRU Cache

The client MUST maintain an in-memory cache with the following properties:

- Maximum 200 entries
- 1-hour TTL per entry
- LRU eviction when the cache is full (oldest entry evicted first)
- Card-by-name lookups and rulings lookups MUST be cached
- Search queries MUST NOT be cached (results change over time)

#### Scenario: Cache hit

- GIVEN a card was previously looked up by name
- WHEN the same card name is requested again within 1 hour
- THEN the cached result is returned without an API call

#### Scenario: Cache expiry

- GIVEN a cached entry is older than 1 hour
- WHEN the same key is requested
- THEN the stale entry is deleted and a fresh API call is made

#### Scenario: Cache eviction

- GIVEN the cache contains 200 entries
- WHEN a new entry is added
- THEN the oldest entry is evicted to make room

### Requirement: Error Handling

The client MUST handle Scryfall error responses:

- **404**: Throw "Not found: {details}"
- **429**: Throw "Rate limited by Scryfall. Please wait a moment and try again."
- **Other errors**: Throw "Scryfall API error ({status}): {details}"

### Requirement: Card Name Lookup

The client MUST support looking up cards by name using `/cards/named` with either `fuzzy` or `exact` query parameters.

### Requirement: Card Search

The client MUST support searching cards using `/cards/search` with query, order, and page parameters. Results MUST use `unique: cards` deduplication.

### Requirement: Card Rulings

The client MUST support fetching rulings using `/cards/{id}/rulings`.

### Requirement: Pagination

The client MUST support fetching the next page of search results via a provided `next_page` URL.
