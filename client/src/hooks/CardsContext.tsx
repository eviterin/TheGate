import { useCallback } from 'react';
import { readContract } from '@wagmi/core';
import { config } from '../../wagmi';
import { useContracts } from './ContractsContext';
import { cards as cardDefinitions } from '../game/cards';
import { CardAnimationType } from '../game/cards';
import defaultCardImage from '../assets/cardart/default.png';

// Import all card images
const cardImages: Record<string, string> = {
  default: defaultCardImage
};

// Load card images
cardDefinitions.forEach(async card => {
  try {
    const module = await import(`../assets/cardart/${card.id}.png`);
    cardImages[card.id] = module.default;
  } catch (error) {
    console.error(`Error loading card image for ${card.id}:`, error);
    cardImages[card.id] = defaultCardImage;
  }
});

export interface CardData {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  isActive: boolean;
  createdAt: bigint;
  lastUpdated: bigint;
  targeted: boolean;
  numericId?: number;
  animationType?: CardAnimationType;
  imageUrl?: string;
  soundEffect?: string;
}

export function useCardsContract() {
  const { contracts } = useContracts();
  if (!contracts.cards) {
    throw new Error('Cards contract not initialized');
  }
  return contracts.cards;
}

export function useCards() {
  const contractConfig = useCardsContract();

  const getActiveCards = useCallback(async (): Promise<CardData[]> => {
    try {
      const cards = await readContract(config, {
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'getActiveCards',
        args: [],
      }) as CardData[];

      // Map the cards to include numeric IDs, animation types, and sound effects from our definitions
      const mappedCards = cards.map((card, index) => {
        const numericId = index + 1;
        const cardDefinition = cardDefinitions.find(c => c.numericId === numericId);
        return {
          ...card,
          numericId,
          animationType: cardDefinition?.animationType || 'none',
          imageUrl: cardImages[cardDefinition?.id || ''] || cardImages.default,
          soundEffect: cardDefinition?.soundEffect || 'smite.wav' // Default to smite.wav if no sound effect defined
        };
      });

      return mappedCards;
    } catch (error) {
      console.error('❌ Error fetching cards:', error);
      throw error;
    }
  }, [contractConfig]);

  return { getActiveCards };
} 