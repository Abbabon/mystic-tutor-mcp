# Card Rulings

## Purpose

The `get_card_rulings` tool retrieves official Wizards of the Coast rulings for a specific card.

## Requirements

### Requirement: Two-Step Lookup

The tool MUST first look up the card by name (fuzzy match) to obtain its ID, then fetch rulings using that ID.

#### Scenario: Successful rulings fetch

- GIVEN a user requests rulings for "Doubling Season"
- WHEN the tool is called
- THEN the card is looked up by name to get its Scryfall ID
- AND the rulings endpoint is queried with that ID
- AND the response includes the card's oracle text plus all published rulings

### Requirement: Rulings Format

The response MUST include: card name, mana cost, type line, oracle text, and a numbered list of rulings with publication date and source.

#### Scenario: Card with no rulings

- GIVEN a card has no official rulings
- WHEN the tool fetches rulings
- THEN the response includes the card details
- AND states "No official rulings found for this card."

### Requirement: Error Handling

The tool MUST return an error response with `isError: true` when the lookup or rulings fetch fails.
