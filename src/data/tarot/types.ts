export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type TarotArcana = 'major' | 'minor';
export type TarotElement = 'fire' | 'water' | 'air' | 'earth';

export interface TarotCard {
  id: string;
  name: string;
  arcana: TarotArcana;
  /** 0–21 for Major Arcana; 1–14 for Minor (11=Page, 12=Knight, 13=Queen, 14=King) */
  number: number;
  suit?: TarotSuit;
  element?: TarotElement;
  uprightMeaning: string;
  reversedMeaning: string;
  keywords: string[];
}
