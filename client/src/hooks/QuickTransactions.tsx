import { useCallback, useEffect, useState } from 'react';
import { connect, injected, readContract, simulateContract, writeContract } from '@wagmi/core';
import { config } from '../../wagmi';
import { useHappyChain } from '@happy.tech/react';
import { useContracts } from './ContractsContext';
import { requestSessionKey } from '@happy.tech/core';
import { getContractAddress } from '../utils/contractUtils';
import { happyWagmiConnector } from '@happy.tech/core'

interface QuickTransactionsState {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  isEnabling: boolean;
}

export function useQuickTransactions() {
  const { user } = useHappyChain();
  const { contracts } = useContracts();
  const [state, setState] = useState<QuickTransactionsState>({
    isEnabled: false,
    isLoading: true,
    error: null,
    isEnabling: false
  });

  const checkQuickTransactionsStatus = useCallback(async () => {
    if (!user || !contracts.gameState) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const isEnabled = await readContract(config, {
        ...contracts.gameState,
        functionName: 'getQuickTransactionsEnabled',
        args: [user.address],
      }) as boolean;

      setState(prev => ({
        ...prev,
        isEnabled,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to check quick transactions status:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [user, contracts.gameState]);

  const enableQuickTransactions = useCallback(async () => {
    if (!user || !contracts.gameState) return;

    setState(prev => ({ ...prev, isEnabling: true, error: null }));

    try {
      // Get the current contract address
      const contractAddress = getContractAddress('GameState.sol');
      if (!contractAddress) {
        throw new Error('GameState contract address not found');
      }

      await connect(config, { connector: happyWagmiConnector() })

      // First request session key from HappyChain
      await requestSessionKey(contractAddress as `0x${string}`);

      // Then enable quick transactions in the contract
      const { request } = await simulateContract(config, {
        ...contracts.gameState,
        functionName: 'enableQuickTransactions',
        args: [],
      });

      // Send it
      writeContract(config, request).catch(error => {
        console.error('Failed to enable quick transactions in contract:', error);
      });
      
      // Update state optimistically
      setState(prev => ({
        ...prev,
        isEnabled: true,
        isEnabling: false,
        error: null
      }));

      console.log('✅ Quick transactions enabled successfully');
    } catch (error) {
      console.error('Failed to enable quick transactions:', error);
      setState(prev => ({
        ...prev,
        isEnabling: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      throw error;
    }
  }, [user, contracts.gameState]);

  // Check status on mount and when dependencies change
  useEffect(() => {
    checkQuickTransactionsStatus();
  }, [checkQuickTransactionsStatus]);

  return {
    isEnabled: state.isEnabled,
    isLoading: state.isLoading,
    error: state.error,
    isEnabling: state.isEnabling,
    enableQuickTransactions,
    checkStatus: checkQuickTransactionsStatus
  };
} 