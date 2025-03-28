import { useCallback } from 'react';
import { readContract, writeContract, simulateContract, waitForTransaction } from '@wagmi/core';
import { config } from '../../wagmi';
import { getCurrentUser } from '@happy.tech/core';
import { useContracts } from './ContractsContext';
import { getContractAddress } from '../utils/contractUtils';
import { useWalletConnection } from './useWalletConnection';

interface GameStateData {
    runState: number;
    currentFloor: number;
    maxHealth: number;
    currentHealth: number;
    currentBlock: number;
    currentMana: number;
    maxMana: number;
    enemyTypes: number[];
    enemyMaxHealth: number[];
    enemyCurrentHealth: number[];
    enemyIntents: number[];
    enemyBlock: number[];
    enemyBuffs: number[];
    hand: number[];
    deck: number[];
    draw: number[];
    discard: number[];
    availableCardRewards: number[];
    lastChosenCard: number;
}

export function useGameContract() {
    const { contracts } = useContracts();
    if (!contracts.gameState) {
        throw new Error('GameState contract not initialized');
    }
    return contracts.gameState;
}

export function useVictoryTrackerContract() {
    const { contracts } = useContracts();
    if (!contracts.victoryTracker) {
        throw new Error('VictoryTracker contract not initialized');
    }
    return contracts.victoryTracker;
}

export function useStartRun() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const startRun = useCallback(async () => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }
        
        try {
            console.log('Starting new run...', {
                callerAddress: currentUser.address,
            });

            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'startRun',
                args: [],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);

            console.log('Run started:', { hash, user: currentUser.address });
            return hash;
        } catch (error) {
            console.error('Error starting run:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { startRun };
}

export function useAbandonRun() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const abandonRun = useCallback(async () => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Abandoning run...', {
                callerAddress: currentUser.address,
            });

            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'abandonRun',
                args: [],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);

            console.log('Run abandoned:', { hash });
            return hash;
        } catch (error) {   
            console.error('Error abandoning run:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { abandonRun };
}

export function useChooseRoom() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const chooseRoom = useCallback(async (option: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Choosing room with option:', option);
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'chooseRoom',
                args: [option],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);

            console.log('Room chosen:', { hash, option });
            return hash;
        } catch (error) {   
            console.error('Error choosing room:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { chooseRoom };
}

export function usePlayCard() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const playCard = useCallback(async (cardIndex: number, targetIndex: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Playing card...', { cardIndex, targetIndex });
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'playCard',
                args: [cardIndex, targetIndex],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);

            // Wait for transaction to be confirmed
            await waitForTransaction(config, { hash });

            console.log('Card played:', { hash });
            return hash;
        } catch (error) {   
            console.error('Error playing card:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { playCard };
}

// Add new hook for playing multiple cards
export interface CardPlay {
    cardIndex: number;
    targetIndex: number;
}

export function usePlayCards() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const playCards = useCallback(async (plays: CardPlay[]) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Playing multiple cards...', { plays });
            
            // Convert plays to contract format (uint8 arrays)
            const contractPlays = plays.map(play => ({
                cardIndex: play.cardIndex as number,
                targetIndex: play.targetIndex as number
            }));
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction to check for potential errors
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'playCards',
                args: [contractPlays],
                account: currentUser.address,
            });

            // If simulation succeeds, send the actual transaction
            const hash = await writeContract(config, request);

            // Wait for transaction to be confirmed
            await waitForTransaction(config, { hash });

            console.log('Multiple cards played:', { hash });
            return hash;
        } catch (error) {   
            console.error('Error playing multiple cards:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { playCards };
}

export function useEndTurn() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const endTurn = useCallback(async () => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Ending turn...');
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'endTurn',
                args: [],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);

            // Wait for transaction to be confirmed
            await waitForTransaction(config, { hash });

            console.log('Turn ended:', { hash });
            return hash;
        } catch (error) {   
            console.error('Error ending turn:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { endTurn };
}

// Add helper function to check if game states are different
function hasGameStateChanged(oldState: any, newState: any): boolean {
    if (!oldState || !newState) return true;
    
    // Compare relevant fields that indicate meaningful changes
    return oldState.runState !== newState.runState ||
           oldState.currentFloor !== newState.currentFloor ||
           oldState.currentHealth !== newState.currentHealth ||
           oldState.currentMana !== newState.currentMana ||
           oldState.currentBlock !== newState.currentBlock ||
           oldState.lastChosenCard !== newState.lastChosenCard ||
           JSON.stringify(oldState.hand) !== JSON.stringify(newState.hand) ||
           JSON.stringify(oldState.enemyCurrentHealth) !== JSON.stringify(newState.enemyCurrentHealth) ||
           JSON.stringify(oldState.enemyBlock) !== JSON.stringify(newState.enemyBlock) ||
           JSON.stringify(oldState.enemyIntents) !== JSON.stringify(newState.enemyIntents);
}

// Keep track of last game state
let lastGameState: any = null;

export function useGameState() {
    const contractConfig = useGameContract();

    const getGameState = useCallback(async (address?: string): Promise<GameStateData | null> => {
        try {
            const currentUser = getCurrentUser();
            const targetAddress = address || currentUser?.address;
            
            if (!targetAddress) {
                console.warn('No address provided and no current user found');
                return null;
            }

            // First get the scalar values from playerData
            const state = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'playerData',
                args: [targetAddress],
            }) as any;

            // Get enemy data
            const [enemyTypes, enemyMaxHealth, enemyCurrentHealth, enemyIntents, enemyBlock, enemyBuffs] = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getEnemyData',
                args: [targetAddress],
            }) as [number[], number[], number[], number[], number[], number[]];

            // Get player data (deck, hand, draw, discard)
            const [deck, hand, draw, discard] = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getPlayerData',
                args: [targetAddress],
            }) as [number[], number[], number[], number[]];

            // Get available rewards
            const availableRewards = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getAvailableRewards',
                args: [targetAddress],
            }) as number[];

            // Convert the responses to our interface with safe defaults
            const gameState: GameStateData = {
                runState: Number(state[0] ?? 0),
                currentFloor: Number(state[1] ?? 0),
                maxHealth: Number(state[2] ?? 0),
                currentHealth: Number(state[3] ?? 0),
                currentBlock: Number(state[4] ?? 0),
                currentMana: Number(state[5] ?? 0),
                maxMana: Number(state[6] ?? 0),
                lastChosenCard: Number(state[16] ?? 0),
                enemyTypes: Array.isArray(enemyTypes) ? enemyTypes.map(Number) : [],
                enemyMaxHealth: Array.isArray(enemyMaxHealth) ? enemyMaxHealth.map(Number) : [],
                enemyCurrentHealth: Array.isArray(enemyCurrentHealth) ? enemyCurrentHealth.map(Number) : [],
                enemyIntents: Array.isArray(enemyIntents) ? enemyIntents.map(Number) : [],
                enemyBlock: Array.isArray(enemyBlock) ? enemyBlock.map(Number) : [],
                enemyBuffs: Array.isArray(enemyBuffs) ? enemyBuffs.map(Number) : [],
                hand: Array.isArray(hand) ? hand.map(Number) : [],
                deck: Array.isArray(deck) ? deck.map(Number) : [],
                draw: Array.isArray(draw) ? draw.map(Number) : [],
                discard: Array.isArray(discard) ? discard.map(Number) : [],
                availableCardRewards: Array.isArray(availableRewards) ? availableRewards.map(Number) : []
            };

            if (hasGameStateChanged(lastGameState, gameState)) {
                console.log('Processed game state:', gameState);
                lastGameState = { ...gameState };
            }

            return gameState;
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    }, [contractConfig]);

    return { getGameState };
}

export function useIsCurrentRunner() {
    const contractConfig = useGameContract();

    const isCurrentRunner = useCallback(async (address: string): Promise<boolean> => {
        try {
            const result = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'isCurrentRunner',
                args: [address],
            });
            return result as boolean;
        } catch (error) {
            console.error('Error checking current runner:', error);
            throw error;
        }
    }, [contractConfig]);

    return { isCurrentRunner };
}

export function useTakeGameAction() {
    const contractConfig = useGameContract();

    const takeGameAction = useCallback(async (actionType: number, args: number[] = []) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('✨ Taking game action...', {
                callerAddress: currentUser.address,
                actionType,
                args
            });

            const hash = await writeContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'takeGameAction',
                args: [actionType, args],
            });

            console.log('✅ Game action taken:', { hash, actionType, args });
            return hash;
        } catch (error) {
            console.error('❌ Error taking game action:', error);
            throw error;
        }
    }, [contractConfig]);

    return { takeGameAction };
}

export function useSetObamaNumbers() {
    const contractConfig = useGameContract();

    const setObamaNumbers = useCallback(async (numbers: number[]) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('✨ Setting obama numbers...', {
                callerAddress: currentUser.address,
                numbers
            });

            const hash = await writeContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'setObamaNumbers',
                args: [numbers],
            });

            console.log('✅ Obama numbers set:', { hash });
            return hash;
        } catch (error) {
            console.error('❌ Error setting obama numbers:', error);
            throw error;
        }
    }, [contractConfig]);

    return { setObamaNumbers };
}

export function useSetObamaNumbers2() {
    const contractConfig = useGameContract();

    const setObamaNumbers2 = useCallback(async (numbers: number[]) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('✨ Setting obama numbers 2...', {
                callerAddress: currentUser.address,
                numbers
            });

            const hash = await writeContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'setObamaNumbers2',
                args: [numbers],
            });

            console.log('✅ Obama numbers 2 set:', { hash });
            return hash;
        } catch (error) {
            console.error('❌ Error setting obama numbers 2:', error);
            throw error;
        }
    }, [contractConfig]);

    return { setObamaNumbers2 };
}

export function useGetObamaNumbers() {
    const contractConfig = useGameContract();

    const getObamaNumbers = useCallback(async (address: string): Promise<number[]> => {
        try {
            console.log('🔍 Reading obama numbers for address:', address);
            
            const numbers = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getObamaNumbers',
                args: [address],
            }) as number[];

            console.log('📦 Obama numbers:', numbers);
            return numbers;
        } catch (error) {
            console.error('❌ Error getting obama numbers:', error);
            throw error;
        }
    }, [contractConfig]);

    return { getObamaNumbers };
}

export function useGetObamaNumbers2() {
    const contractConfig = useGameContract();

    const getObamaNumbers2 = useCallback(async (address: string): Promise<number[]> => {
        try {
            console.log('🔍 Reading obama numbers 2 for address:', address);
            
            const numbers = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getObamaNumbers2',
                args: [address],
            }) as number[];

            console.log('📦 Obama numbers 2:', numbers);
            return numbers;
        } catch (error) {
            console.error('❌ Error getting obama numbers 2:', error);
            throw error;
        }
    }, [contractConfig]);

    return { getObamaNumbers2 };
}

export function useGetAllObamaNumbers() {
    const contractConfig = useGameContract();

    const getAllObamaNumbers = useCallback(async (address: string): Promise<[number[], number[]]> => {
        try {
            console.log('🔍 Reading all obama numbers for address:', address);
            
            const [numbers1, numbers2] = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getAllObamaNumbers',
                args: [address],
            }) as [number[], number[]];

            const asd = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getAllObamaNumbers',
                args: [address],
            });

            console.log('asd:', asd);

            console.log('📦 All obama numbers:', { numbers1, numbers2 });
            return [numbers1, numbers2];
        } catch (error) {
            console.error('❌ Error getting all obama numbers:', error);
            throw error;
        }
    }, [contractConfig]);

    return { getAllObamaNumbers };
}

export function useDebugFloorControls() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const nextFloor = useCallback(async () => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Moving to next floor...');
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'debugNextFloor',
                args: [],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);
            
            return hash;
        } catch (error) {
            console.error('Error moving to next floor:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    const previousFloor = useCallback(async () => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Moving to previous floor...');
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'debugPreviousFloor',
                args: [],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);
            
            return hash;
        } catch (error) {
            console.error('Error moving to previous floor:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    const setFloor = useCallback(async (floor: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Setting floor to:', floor);
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'debugSetFloor',
                args: [floor],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);
            
            return hash;
        } catch (error) {
            console.error('Error setting floor:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { nextFloor, previousFloor, setFloor };
}

export function useDebugHealthControls() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const addHealth = useCallback(async (amount: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Adding health:', amount);
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'debugAddHealth',
                args: [amount],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);
            
            return hash;
        } catch (error) {
            console.error('Error adding health:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    const removeHealth = useCallback(async (amount: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Removing health:', amount);
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'debugRemoveHealth',
                args: [amount],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);
            
            return hash;
        } catch (error) {
            console.error('Error removing health:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    const setMaxHealth = useCallback(async (newMax: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Setting max health:', newMax);
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'debugSetMaxHealth',
                args: [newMax],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);
            
            return hash;
        } catch (error) {
            console.error('Error setting max health:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { addHealth, removeHealth, setMaxHealth };
}

export function useChooseCardReward() {
    const contractConfig = useGameContract();
    const { ensureConnected } = useWalletConnection();

    const chooseCardReward = useCallback(async (cardId: number) => {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            throw new Error('No user connected');
        }

        try {
            console.log('Choosing card reward...', { cardId });
            
            // Ensure we're connected before proceeding
            await ensureConnected();
            
            // First simulate the transaction
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'chooseCardReward',
                args: [cardId],
                account: currentUser.address,
            });
            
            // Then execute it
            const hash = await writeContract(config, request);

            console.log('Card reward chosen:', { hash });
            return hash;
        } catch (error) {   
            console.error('Error choosing card reward:', error);
            throw error;
        }
    }, [contractConfig, ensureConnected]);

    return { chooseCardReward };
}

export function useGetAvailableRewards() {
    const contractConfig = useGameContract();

    const getAvailableRewards = useCallback(async (address: string): Promise<number[]> => {
        try {
            console.log('Reading available rewards for address:', address);
            
            const rewards = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getAvailableRewards',
                args: [address],
            }) as number[];

            console.log('Available rewards:', rewards);
            return rewards;
        } catch (error) {
            console.error('Error getting available rewards:', error);
            throw error;
        }
    }, [contractConfig]);

    return { getAvailableRewards };
}

// VictoryTracker hooks
export function useHasPlayerWon() {
    const contractConfig = useVictoryTrackerContract();

    const hasPlayerWon = useCallback(async (address: string): Promise<boolean> => {
        try {
            console.log('Checking if player has won:', address);
            
            const result = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'hasPlayerWon',
                args: [address],
            }) as boolean;

            console.log('Player victory status:', { address, hasWon: result });
            return result;
        } catch (error) {
            console.error('Error checking player victory:', error);
            throw error;
        }
    }, [contractConfig]);

    return { hasPlayerWon };
}

export function useGetAllWinners() {
    const contractConfig = useVictoryTrackerContract();

    const getAllWinners = useCallback(async (): Promise<string[]> => {
        try {
            console.log('Getting all winners...');
            
            const winners = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'getAllWinners',
                args: [],
            }) as string[];

            console.log('All winners:', winners);
            return winners;
        } catch (error) {
            console.error('Error getting winners:', error);
            throw error;
        }
    }, [contractConfig]);

    return { getAllWinners };
} 