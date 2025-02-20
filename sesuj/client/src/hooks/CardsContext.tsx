import { createContext, useContext, useCallback } from 'react';
import { readContract } from '@wagmi/core';
import { config } from '../../wagmi';
import { useContracts } from './ContractsContext';

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

      // Map the cards to include numeric IDs based on their index in the array
      const mappedCards = cards.map((card, index) => ({
        ...card,
        numericId: index + 1 // Since our numeric IDs start from 1
      }));

      console.log('📦 Fetched and mapped cards:', mappedCards);
      return mappedCards;
    } catch (error) {
      console.error('❌ Error fetching cards:', error);
      throw error;
    }
  }, [contractConfig]);

  return { getActiveCards };
} 