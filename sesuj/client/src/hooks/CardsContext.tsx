import { createContext, useContext, useCallback } from 'react';
import { readContract } from '@wagmi/core';
import { config } from '../../wagmi';
import { useContracts } from './ContractsContext';
import { cards as cardDefinitions } from '../game/cards';

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
  animationType?: 'jump' | 'flip' | 'none';
  imageUrl?: string;
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
      console.log('🔍 Fetching active cards from chain...');
      
      const cards = await readContract(config, {
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'getActiveCards',
        args: [],
      }) as CardData[];

      // Map the cards to include numeric IDs and animation types from our definitions
      const mappedCards = cards.map((card, index) => {
        const numericId = index + 1;
        const cardDefinition = cardDefinitions.find(c => c.numericId === numericId);
        return {
          ...card,
          numericId,
          animationType: cardDefinition?.animationType || 'none',
          imageUrl: new URL(`../assets/cardart/${card.id}.png`, import.meta.url).href
        };
      });

      console.log('📦 Fetched and mapped cards:', mappedCards);
      return mappedCards;
    } catch (error) {
      console.error('❌ Error fetching cards:', error);
      throw error;
    }
  }, [contractConfig]);

  return { getActiveCards };
} 