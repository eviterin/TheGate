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
    }[];
}

export type CardAnimationType = 'jump' | 'flip' | 'none';

export interface CardData {
    numericId: number;
    id: string;
    name: string;
    description: string;
    manaCost: number;
    targeted: boolean;
    imagePath?: string; 
    animationType: CardAnimationType;
}

const typedCardData = cardData as CardDataJson;

export const cards: CardData[] = typedCardData.cards.map((card) => ({
    ...card,
    imagePath: `assets/cardart/${card.id}.png`
}));

export function getCardById(id: string): CardData | undefined {
    return cards.find(card => card.id === id);
}

export function getCardByNumericId(numericId: number): CardData | undefined {
    return cards.find(card => card.numericId === numericId);
} 