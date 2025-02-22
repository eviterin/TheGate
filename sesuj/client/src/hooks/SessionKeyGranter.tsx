import { useState, useCallback } from 'react';
import { requestSessionKey } from '@happy.tech/core';
import { getContractAddress } from '../utils/contractUtils';

interface SessionKeyStatus {
  gameState: boolean;
  encounters: boolean;
}

interface SessionKeyProgress {
  isEnabling: boolean;
  currentContract: string | null;
}

export function useSessionKeyGranter() {
  const [status, setStatus] = useState<SessionKeyStatus>({
    gameState: false,
    encounters: false
  });
  const [progress, setProgress] = useState<SessionKeyProgress>({
    isEnabling: false,
    currentContract: null
  });

  const grantSessionKeys = useCallback(async () => {
    setProgress({ isEnabling: true, currentContract: null });
    const results: SessionKeyStatus = {
      gameState: false,
      encounters: false
    };

    try {
      // Enable for GameState
      const gameStateAddress = getContractAddress('GameState.sol');
      if (gameStateAddress) {
        try {
          setProgress({ isEnabling: true, currentContract: 'Game' });
          await requestSessionKey(gameStateAddress as `0x${string}`);
          results.gameState = true;
          console.log('✅ GameState quick transactions enabled');
        } catch (error) {
          console.error('❌ Failed to enable quick transactions for GameState:', error);
          throw error;
        }
      }

      // Enable for GameEncounters
      const encountersAddress = getContractAddress('GameEncounters.sol');
      if (encountersAddress) {
        try {
          setProgress({ isEnabling: true, currentContract: 'Encounters' });
          await requestSessionKey(encountersAddress as `0x${string}`);
          results.encounters = true;
          console.log('✅ GameEncounters quick transactions enabled');
        } catch (error) {
          console.error('❌ Failed to enable quick transactions for GameEncounters:', error);
          throw error;
        }
      }

      setStatus(results);
      return results;
    } catch (error) {
      console.error('❌ Error enabling quick transactions:', error);
      throw error;
    } finally {
      setProgress({ isEnabling: false, currentContract: null });
    }
  }, []);

  return {
    grantSessionKeys,
    progress,
    status
  };
}
