import './App.css'
import './styles/fonts.css'
import { useHappyChain, ConnectButton } from '@happy.tech/react'
import Playground from './components/Playground'
import { useState, useEffect } from 'react'
import { ContractsProvider } from './hooks/ContractsContext'
import MusicPlayer from './components/MusicPlayer'
import LoadingIndicator from './components/LoadingIndicator'
import Game from './components/Game'
import { useQuickTransactions } from './hooks/QuickTransactions'
import { useGameState } from './hooks/GameState'

const styles = {
  appContainer: {
    height: '100vh',
    width: '100vw',
    margin: 0,
    padding: 0,
    backgroundImage: 'url(/src/assets/arenas/room_0.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    transform: 'translateY(20vh)'
  }
};

function QuickTransactionsPrompt({ onClose }: { onClose: () => void }) {
  const { enableQuickTransactions, isEnabling, error } = useQuickTransactions();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEnable = async () => {
    try {
      await enableQuickTransactions();
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to enable quick transactions:', error);
    }
  };

  return (
    <div className="quick-transactions-prompt" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#2d2d2d',
      color: '#e0e0e0',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      zIndex: 1000,
      border: '1px solid #3d3d3d'
    }}>
      {isSuccess ? (
        <div style={{ color: '#48bb78', fontSize: '18px' }}>
          ✅ Quick Transactions Enabled!
        </div>
      ) : (
        <>
          <h2 style={{ marginBottom: '1rem' }}>One Last Step</h2>
          <p style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
            To play the game, you'll need to enable quick transactions. This allows you to play without having to confirm every action.
          </p>
          {error && (
            <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
          )}
          <button
            onClick={handleEnable}
            disabled={isEnabling}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2c5282',
              color: '#e0e0e0',
              border: '1px solid #1a365d',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: isEnabling ? 0.7 : 1,
              fontSize: '16px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => {
              if (!isEnabling) {
                e.currentTarget.style.backgroundColor = '#2b6cb0';
                e.currentTarget.style.borderColor = '#2c5282';
              }
            }}
            onMouseOut={e => {
              if (!isEnabling) {
                e.currentTarget.style.backgroundColor = '#2c5282';
                e.currentTarget.style.borderColor = '#1a365d';
              }
            }}
          >
            {isEnabling ? 'Enabling...' : 'Enable Quick Transactions'}
          </button>
        </>
      )}
    </div>
  );
}

function AppContent() {
  const { isEnabled, isLoading } = useQuickTransactions()
  const [showQuickTxPrompt, setShowQuickTxPrompt] = useState(false)

  useEffect(() => {
    if (!isLoading && !isEnabled) {
      setShowQuickTxPrompt(true)
    }
  }, [isLoading, isEnabled])

  if (isLoading) {
    return (
      <div style={styles.appContainer}>
        <LoadingIndicator message="Checking settings..." />
      </div>
    )
  }

  if (showQuickTxPrompt) {
    return (
      <div style={styles.appContainer}>
        <QuickTransactionsPrompt onClose={() => {
          setShowQuickTxPrompt(false)
        }} />
        <MusicPlayer />
      </div>
    )
  }

  return (
    <div style={styles.appContainer}>
      <Game />
      <MusicPlayer />
    </div>
  );
}

function App() {
  const { user } = useHappyChain()
  const [isInitializing, setIsInitializing] = useState(true)
  
  if (!user) {
    return (
      <div style={styles.appContainer}>
        <div style={styles.loginContainer}>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <ContractsProvider onInitialized={() => setIsInitializing(false)}>
        <div style={styles.appContainer}>
          <LoadingIndicator message="Initializing game..." />
        </div>
      </ContractsProvider>
    );
  }

  return (
    <>
      <ContractsProvider>
        <AppContent />
      </ContractsProvider>
    </>
  );
}

export default App
