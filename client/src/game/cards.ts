import cardData from '../../../shared/cards.json';

interface CardDataJson {
    cards: {
        numericId: number;
        id: string;
        name: string;
        description: string;
        manaCost: number;
        targeted: boolean;
        animationType: CardAnimationType;
        soundEffect: string;
    }[];
}

export type CardAnimationType = 'jump' | 'flip' | 'none' | 'slash' | 'float' | 'zigzag' | 'pulse';

export interface CardData {
    numericId: number;
    id: string;
    name: string;
    description: string;
    manaCost: number;
    targeted: boolean;
    imageUrl: string;
    animationType: CardAnimationType;
    soundEffect: string;
}

const typedCardData = cardData as CardDataJson;

// Map the cards and add image URLs
export const cards: CardData[] = typedCardData.cards.map(card => ({
    ...card,
    imageUrl: new URL(`../assets/cardart/${card.id}.png`, import.meta.url).href
}));

export function getCardById(id: string): CardData | undefined {
    return cards.find(card => card.id === id);
}

export function getCardByNumericId(numericId: number): CardData | undefined {
    return cards.find(card => card.numericId === numericId);
} 