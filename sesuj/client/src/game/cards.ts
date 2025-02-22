import cardData from '../../../shared/cards.json';

// Type for the JSON data structure
interface CardDataJson {
    cards: {
        numericId: number;
        id: string;
        name: string;
        description: string;
        manaCost: number;
        targeted: boolean;
        animationType: CardAnimationType;
    }[];
}

// Define animation types
export type CardAnimationType = 'jump' | 'flip' | 'none';

export interface CardData {
    numericId: number;
    id: string;
    name: string;
    description: string;
    manaCost: number;
    targeted: boolean;
    imagePath?: string;  // Client-only field
    animationType: CardAnimationType;
}

// Assert the type of imported JSON
const typedCardData = cardData as CardDataJson;

export const cards: CardData[] = typedCardData.cards.map((card) => ({
    ...card,
    imagePath: `assets/cardart/${card.id}.png`
}));

// Helper functions
export function getCardById(id: string): CardData | undefined {
    return cards.find(card => card.id === id);
}

export function getCardByNumericId(numericId: number): CardData | undefined {
    return cards.find(card => card.numericId === numericId);
} 