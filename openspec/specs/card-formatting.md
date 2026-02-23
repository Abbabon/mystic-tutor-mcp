# Card Formatting

## Purpose

Utilities for converting Scryfall card data into LLM-friendly text output in verbose and compact modes.

## Requirements

### Requirement: Double-Faced Card Handling

All formatting functions MUST handle double-faced cards (MDFCs, transform) where oracle text, mana cost, and type line live on `card_faces` rather than the top-level card object.

#### Scenario: Double-faced card oracle text

- GIVEN a card has `card_faces` but no top-level `oracle_text`
- WHEN oracle text is extracted
- THEN each face's text is shown with `// Face Name //` headers separated by blank lines

#### Scenario: Double-faced card mana cost

- GIVEN a card has `card_faces` with separate mana costs
- WHEN mana cost is extracted
- THEN the costs are joined with ` // ` separator

### Requirement: Verbose Format

The `formatCard` function MUST produce a full card display including: name (as H2), mana cost, CMC, type line, oracle text, colors, color identity, keywords, power/toughness or loyalty, legalities for key formats, prices (USD, foil, EUR, TIX), set and rarity, EDHREC rank, image URI, and Scryfall link.

### Requirement: Compact Format

The `formatCardCompact` function MUST produce a condensed display including: bold name with mana cost and type line, oracle text truncated to 200 characters, and metadata line with price, EDHREC rank, and rarity.

### Requirement: Rulings Format

The `formatRulings` function MUST produce: card name (as H2), card identity line (name, mana cost, type), oracle text, and a numbered list of rulings each showing publication date, source, and comment text.

#### Scenario: No rulings

- GIVEN a card has zero rulings
- WHEN rulings are formatted
- THEN the output states "No official rulings found for this card."

### Requirement: Legalities Display

The legalities display MUST show status for exactly these formats: Standard, Pioneer, Modern, Legacy, Vintage, Commander, and Pauper.

### Requirement: Price Display

The price display MUST show available values for: USD, Foil USD, EUR, and TIX. If no prices are available, it MUST show "No price data".
