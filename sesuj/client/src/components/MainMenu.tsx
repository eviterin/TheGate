import { useState, useEffect } from 'react';
import { useContracts } from '../hooks/ContractsContext';
import { useGameState, useAbandonRun, useStartRun } from '../hooks/GameState';
import { getCurrentUser } from '@happy.tech/core';
import './MainMenu.css';

const MainMenu: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [hasActiveRun, setHasActiveRun] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { contracts } = useContracts();
  const { getGameState } = useGameState();
  const { abandonRun } = useAbandonRun();
  const { startRun } = useStartRun();

  // Pre-fetch game state
  const [prefetchInterval, setPrefetchInterval] = useState<NodeJS.Timeout | null>(null);
  const startPrefetching = () => {
    // Clear any existing interval
    if (prefetchInterval) clearInterval(prefetchInterval);
    
    // Start aggressive polling (every 200ms)
    const interval = setInterval(async () => {
      try {
        const state = await getGameState();
        if (state?.runState === 1) { // WHALE_ROOM state
          // If we're in whale room, we can stop polling
          if (prefetchInterval) clearInterval(prefetchInterval);
          setPrefetchInterval(null);
        }
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    }, 200);
    
    setPrefetchInterval(interval);
  };

  useEffect(() => {
    return () => {
      // Cleanup interval on unmount
      if (prefetchInterval) clearInterval(prefetchInterval);
    };
  }, [prefetchInterval]);

  useEffect(() => {
    const user = getCurrentUser();
    setUserAddress(user?.address || null);
    console.log('🔑 Current User:', {
      happyTechUser: user?.address,
      contractAddress: contracts.gameState?.address,
    });
  }, [contracts.gameState?.address]);

  // Check for active run
  useEffect(() => {
    const checkGameState = async () => {
      try {
        const state = await getGameState();
        setHasActiveRun(state !== null && (state.runState ?? 0) > 0);
      } catch (error) {
        console.error('Failed to check game state:', error);
      }
    };
    
    checkGameState();
    const interval = setInterval(checkGameState, 5000);
    return () => clearInterval(interval);
  }, [getGameState]);

  const handleAbandonRun = async () => {
    try {
      await abandonRun();
      setHasActiveRun(false);
    } catch (error) {
      console.error('Failed to abandon run:', error);
    }
  };

  const handleStartNewRun = async () => {
    try {
      setIsStarting(true);
      
      // Start prefetching game state
      startPrefetching();
      
      // Navigate immediately with fade animation
      onNavigate('game');
      
      // Start the actual transaction
      await startRun();
    } catch (error) {
      console.error('Failed to start new run:', error);
      setIsStarting(false);
      // Could add error handling UI here
    }
  };

  const menuItems = [
    { 
      label: hasActiveRun ? 'Continue Run' : (isStarting ? 'Starting...' : 'Start New Run'), 
      action: hasActiveRun ? () => onNavigate('game') : handleStartNewRun,
      disabled: !contracts.gameState || isStarting
    },
    ...(hasActiveRun ? [{
      label: 'Abandon Run',
      action: handleAbandonRun,
      disabled: false
    }] : []),
    { 
      label: 'Playground', 
      action: () => onNavigate('playground'),
      disabled: !contracts.gameState 
    }
  ];

  return (
    <div className={`main-menu ${isStarting ? 'starting' : ''}`}>
      <h1>Game Title</h1>
      {userAddress && (
        <div className="user-info" style={{ fontSize: '0.8em', marginBottom: '20px', opacity: 0.7 }}>
          Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
        </div>
      )}
      <div className="menu-items">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            onMouseEnter={() => setIsHovered(item.label)}
            onMouseLeave={() => setIsHovered(null)}
            className={`menu-item ${isHovered === item.label ? 'hovered' : ''} ${item.disabled ? 'disabled' : ''} ${
              item.label === 'Starting...' ? 'starting' : ''
            }`}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MainMenu; 