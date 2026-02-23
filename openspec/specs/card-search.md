# Card Search

## Purpose

The `search_cards` tool searches for Magic: The Gathering cards using Scryfall's full query syntax, returning a paginated list of results in compact format.

## Requirements

### Requirement: Scryfall Query Syntax

The tool MUST accept Scryfall search query syntax (e.g., `t:creature ci:ug mv<=3 keyword:flash`).

### Requirement: Sort Order

The tool MUST support sorting results by: name, released, rarity, color, usd, tix, eur, cmc, power, toughness, edhrec, or penny. The default sort order MUST be `edhrec`.

### Requirement: Result Limit

The tool MUST accept a `limit` parameter (1-25) controlling how many results are returned. The default MUST be 10.

#### Scenario: Limit clamping

- GIVEN a user provides a limit outside the 1-25 range
- WHEN the tool processes the request
- THEN the limit is clamped to the nearest valid value (1 or 25)

### Requirement: Format Legality Filter

The tool SHOULD accept an optional `format_legality` parameter that appends a `f:{format}` clause to the query.

#### Scenario: Filtering by format

- GIVEN a user searches for `t:creature` with `format_legality: "modern"`
- WHEN the search is executed
- THEN the Scryfall query includes `f:modern`

### Requirement: Pagination

The tool MUST fetch a second page of results if the first page has fewer cards than the requested limit and more results are available.

#### Scenario: Multi-page results

- GIVEN a search returns 175 cards total but only 8 on the first page
- WHEN the user requested a limit of 15
- THEN the tool fetches the second page
- AND returns up to 15 total cards

### Requirement: Compact Card Formatting

Each result MUST be formatted in compact mode showing: name, mana cost, type line, truncated oracle text (max 200 chars), price, EDHREC rank, and rarity.

### Requirement: Result Header

The response MUST include a header showing the query, optional format filter, total card count, displayed count, and sort order.

### Requirement: Error Handling

The tool MUST return an error response with `isError: true` when the search fails.
