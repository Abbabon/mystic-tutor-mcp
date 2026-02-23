export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  legalities: Record<string, string>;
  prices: Record<string, string | null>;
  rarity: string;
  set: string;
  set_name: string;
  edhrec_rank?: number;
  penny_rank?: number;
  image_uris?: Record<string, string>;
  scryfall_uri: string;
  rulings_uri: string;
  flavor_text?: string;
  artist?: string;
  released_at?: string;
  // Double-faced cards
  card_faces?: ScryfallCardFace[];
  layout: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  flavor_text?: string;
  image_uris?: Record<string, string>;
}

export interface ScryfallSearchResult {
  object: "list";
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

export interface ScryfallRuling {
  object: "ruling";
  oracle_id: string;
  source: string;
  published_at: string;
  comment: string;
}

export interface ScryfallRulingsResult {
  object: "list";
  has_more: boolean;
  data: ScryfallRuling[];
}

export interface ScryfallError {
  object: "error";
  code: string;
  status: number;
  details: string;
}
