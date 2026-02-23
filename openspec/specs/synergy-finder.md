# Synergy Finder

## Purpose

The `find_synergies` tool discovers cards that synergize with a given card by analyzing its mechanics and searching Scryfall's community synergy tags (otags).

## Requirements

### Requirement: Theme Detection

The tool MUST detect synergy themes by matching the source card's oracle text and type line against a predefined set of patterns. Supported themes include: Token, +1/+1 Counter, Graveyard, Mill, Sacrifice, Lifegain, Blink/Flicker, Card Draw, Ramp, Landfall, Enchantment, and Removal.

#### Scenario: Card with multiple themes

- GIVEN a card's oracle text contains "sacrifice" and "graveyard"
- WHEN themes are detected
- THEN both Sacrifice Synergies and Graveyard Synergies are matched

### Requirement: Otag-Based Search

For each matched theme, the tool MUST search Scryfall using community synergy tags (`otag:`) as the primary query strategy, with oracle text fallback queries when the otag returns no results.

### Requirement: Theme Limit

The tool MUST search at most 3 themes per request to stay within rate limits. If more than 3 themes are detected, the remaining themes MUST be listed as "Additional themes detected but not searched."

### Requirement: Color Identity Constraint

The tool SHOULD accept an optional `color_identity` parameter that limits results to cards within the specified color identity using `ci<=`.

### Requirement: Format Filter

The tool MUST accept a `format` parameter (default: `commander`) and apply `f:{format}` to all queries.

### Requirement: Per-Theme Result Limit

The `limit` parameter (1-25, default 10) MUST control the maximum number of results per theme.

### Requirement: Fallback for No Themes

When no synergy themes are detected, the tool MUST fall back to searching for popular cards of the same type using EDHREC ranking.

#### Scenario: No mechanical synergy detected

- GIVEN a card whose oracle text matches none of the synergy patterns
- WHEN the tool runs
- THEN it searches by card type with EDHREC sort
- AND the response states "No specific mechanical synergies detected"

### Requirement: Self-Exclusion

All synergy searches MUST exclude the source card itself from results using `-!"Card Name"`.

### Requirement: Error Handling

The tool MUST return an error response with `isError: true` when the synergy search fails.
