export interface CardData {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  imageUrl?: string;
}

// Import card images
import explodicate from '../assets/cardart/explodicate.png';
import preach from '../assets/cardart/preach.png';
import fortifyFaith from '../assets/cardart/fortify_faith.png';
// Add more imports as needed...

// Frontend mapping of numeric IDs to card data
export const cardData: { [key: number]: CardData } = {
  1: {
    id: 'explodicate',
    name: 'Explodicate',
    description: 'Jasins really long text description that is used for testing purposes and stuff like that :)',
    manaCost: 1,
    imageUrl: explodicate
  },
  2: {
    id: 'preach',
    name: 'Preach',
    description: 'Deal 5 damage',
    manaCost: 3,
    imageUrl: preach
  },
  3: {
    id: 'fortify_faith',
    name: 'Fortify Faith',
    description: 'Gain 5 defense',
    manaCost: 2,
    imageUrl: fortifyFaith
  },
  4: {
    id: 'read_scripture',
    name: 'Read Scripture',
    description: 'Restore 5 health',
    manaCost: 2
  },
  5: {
    id: 'condemn_sin',
    name: 'Condemn Sin',
    description: 'Debuff',
    manaCost: 1
  },
  6: {
    id: 'divine_wrath',
    name: 'Divine Wrath',
    description: 'Convert 5, Apply fear',
    manaCost: 4
  },
  7: {
    id: 'show_mercy',
    name: 'Show Mercy',
    description: 'todo',
    manaCost: 1
  },
  8: {
    id: 'exorcism',
    name: 'Exorcism',
    description: 'Convert 7, Purge',
    manaCost: 5
  },
  9: {
    id: 'divine_protection',
    name: 'Divine Protection',
    description: 'Gain 7 block',
    manaCost: 2
  },
  10: {
    id: 'guardian_angel',
    name: 'Guardian Angel',
    description: 'Gain 3 block each turn for 3 turns',
    manaCost: 3
  },
  11: {
    id: 'unshakeable_faith',
    name: 'Unshakeable Faith',
    description: 'Negate next instance of damage',
    manaCost: 2
  },
  12: {
    id: 'pray',
    name: 'Pray',
    description: 'Gain 1 faith next turn',
    manaCost: 1
  },
  13: {
    id: 'fasting',
    name: 'Fasting',
    description: 'Take 5 damage, gain 2 faith next turn',
    manaCost: 1
  },
  14: {
    id: 'speak_in_tongues',
    name: 'Speak in Tongues',
    description: 'Apply Confusion',
    manaCost: 2
  },
  15: {
    id: 'lay_on_hands',
    name: 'Lay on Hands',
    description: 'todo',
    manaCost: 2
  },
  16: {
    id: 'pontificate_truth',
    name: 'Pontificate Truth',
    description: 'Draw 2 cards',
    manaCost: 2
  },
  17: {
    id: 'divine_revelation',
    name: 'Divine Revelation',
    description: 'Draw 3 cards, Discard hand',
    manaCost: 3
  },
  18: {
    id: 'holy_fire',
    name: 'Holy Fire',
    description: 'Convert 15 on all enemies',
    manaCost: 6
  },
  19: {
    id: 'pious_martyr',
    name: 'Pious Martyr',
    description: 'Lose 10 hp, gain 3 faith',
    manaCost: 2
  },
  20: {
    id: 'ascend',
    name: 'Ascend',
    description: 'Gain 10 block, Restore 10 health, Draw 2 cards',
    manaCost: 4
  },
  21: {
    id: 'judgement',
    name: 'Judgement',
    description: "Apply 'doom'",
    manaCost: 7
  }
};

// Helper functions
export const getCardByNumericId = (numericId: number): CardData | undefined => {
  return cardData[numericId];
};

export const getCardByStringId = (stringId: string): CardData | undefined => {
  return Object.values(cardData).find(card => card.id === stringId);
};

// Export all cards as an array if needed
export const getAllCards = (): CardData[] => Object.values(cardData); 