# Similar Cards

## Purpose

The `find_similar` tool finds cards similar to a given card by decomposing it into searchable attributes based on selected criteria.

## Requirements

### Requirement: Similarity Criteria

The tool MUST support four criteria modes:

- **overall** (default): Combines card type + CMC range (+/-1) + one mechanical phrase
- **function**: Matches by mechanical effects/oracle text phrases (top 2-3 patterns)
- **stats**: Matches by CMC (+/-1), power (+/-1), toughness (+/-1), and primary card type
- **type**: Matches by card types and subtypes (subtypes use OR logic)

#### Scenario: Overall similarity

- GIVEN a user searches for cards similar to "Llanowar Elves" with criteria "overall"
- WHEN the tool runs
- THEN it searches by creature type + CMC 0-2 + mana-related phrase

#### Scenario: Function similarity

- GIVEN a user searches for cards similar to a card with "draw a card" text
- WHEN criteria is "function"
- THEN the search matches cards with similar oracle text patterns

#### Scenario: Stats similarity

- GIVEN a card has CMC 3, power 2, toughness 3
- WHEN criteria is "stats"
- THEN the search matches creatures with CMC 2-4, power 1-3, toughness 2-4

#### Scenario: Type similarity

- GIVEN a card is a "Creature — Elf Druid"
- WHEN criteria is "type"
- THEN the search matches creatures that are Elves OR Druids

### Requirement: Relaxed Search Fallback

If the initial search returns fewer than 3 results and the query has multiple constraints, the tool MUST retry with the last constraint removed.

#### Scenario: Too few results

- GIVEN an initial search returns only 1 card
- WHEN the query had 3 constraints
- THEN a relaxed query is attempted with the last constraint dropped
- AND if the relaxed query finds more cards, those results are used instead

### Requirement: Color Identity Constraint

The tool SHOULD accept an optional `color_identity` parameter using `ci<=`.

### Requirement: Format Filter

The tool MUST accept a `format` parameter (default: `commander`) with `f:{format}` applied.

### Requirement: Result Limit

The `limit` parameter (1-25, default 10) MUST control the maximum number of results. Results are sorted by EDHREC rank.

### Requirement: Self-Exclusion

All searches MUST exclude the source card itself from results.

### Requirement: Mechanical Phrase Extraction

The function criteria MUST recognize at least the following mechanical patterns: destroy target, exile target, deal damage, draw cards, create tokens, counter target, search library, return from graveyard, discard, gain life, lose life, can't be blocked, flash, flying, trample, deathtouch, haste, vigilance, lifelink, +1/+1 counters, and mill.

### Requirement: Error Handling

The tool MUST return an error response with `isError: true` when the search fails.
