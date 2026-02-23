# Card Lookup

## Purpose

The `get_card` tool retrieves a single Magic: The Gathering card by name, returning detailed information formatted for LLM consumption.

## Requirements

### Requirement: Fuzzy Name Matching

The tool MUST support fuzzy card name matching by default.

#### Scenario: Fuzzy lookup

- GIVEN a user provides an approximate card name (e.g., "bolt")
- WHEN the tool is called with `exact: false` (default)
- THEN the Scryfall fuzzy endpoint returns the best match
- AND the card is formatted in verbose mode

### Requirement: Exact Name Matching

The tool MUST support exact card name matching when `exact: true`.

#### Scenario: Exact lookup

- GIVEN a user provides a card name with `exact: true`
- WHEN the tool is called
- THEN only an exact name match is returned
- AND a not-found error is returned if no exact match exists

### Requirement: Verbose Card Formatting

The tool MUST return the card in verbose format including: name, mana cost, CMC, type line, oracle text, colors, color identity, keywords, power/toughness or loyalty, legalities (standard, pioneer, modern, legacy, vintage, commander, pauper), prices (USD, foil, EUR, TIX), set name, rarity, EDHREC rank, image URI, and Scryfall link.

### Requirement: Error Handling

The tool MUST return an error response with `isError: true` when the card lookup fails.

#### Scenario: Card not found

- GIVEN a user provides a name that matches no card
- WHEN the Scryfall API returns a 404
- THEN the tool returns an error message describing the failure
- AND the response has `isError: true`
