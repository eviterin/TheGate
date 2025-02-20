import { useState, useEffect } from 'react';
import { useContracts } from '../hooks/ContractsContext';
import { useGameState, useAbandonRun, useStartRun } from '../hooks/GameState';
import { getCurrentUser } from '@happy.tech/core';
import './MainMenu.css';

const MainMenu: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [hasActiveRun, setHasActiveRun] = useState(false);
  const { contracts } = useContracts();
  const { getGameState } = useGameState();
  const { abandonRun } = useAbandonRun();
  const { startRun } = useStartRun();

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
      await startRun();
      console.log('Successfully started new run');
      onNavigate('game');
    } catch (error) {
      console.error('Failed to start new run:', error);
    }
  };

  const menuItems = [
    { 
      label: hasActiveRun ? 'Continue Run' : 'Start New Run', 
      action: hasActiveRun ? () => onNavigate('game') : handleStartNewRun,
      disabled: !contracts.gameState
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
    <div className="main-menu">
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
            className={`menu-item ${isHovered === item.label ? 'hovered' : ''} ${item.disabled ? 'disabled' : ''}`}
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