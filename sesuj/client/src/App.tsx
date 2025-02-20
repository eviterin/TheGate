import './App.css'
import './styles/fonts.css'
import { useHappyChain, ConnectButton } from '@happy.tech/react'
import MainMenu from './components/MainMenu'
import Playground from './components/Playground'
import { useState, useEffect } from 'react'
import { ContractsProvider } from './hooks/ContractsContext'
import MusicPlayer from './components/MusicPlayer'
import LoadingIndicator from './components/LoadingIndicator'
import Game from './components/Game'
import { useQuickTransactions } from './hooks/QuickTransactions'

function QuickTransactionsPrompt({ onClose }: { onClose: () => void }) {
  const { enableQuickTransactions, isEnabling, error } = useQuickTransactions();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEnable = async () => {
    try {
      await enableQuickTransactions();
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to enable quick transactions:', error);
    }
  };

  const handleClose = () => {
    // Always call onClose to close the prompt
    onClose();
  };

  return (
    <div className="quick-transactions-prompt" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#2d2d2d',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      zIndex: 1000
    }}>
      {isSuccess ? (
        <>
          <h2 style={{ marginBottom: '1rem', color: '#48bb78' }}>✅ Quick Transactions Enabled!</h2>
          <p style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
            You can now play without having to confirm every action.
          </p>
          <button
            onClick={handleClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#48bb78',
              color: '#e0e0e0',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </>
      ) : (
        <>
          <h2 style={{ marginBottom: '1rem' }}>Enable Quick Transactions</h2>
          <p style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Would you like to enable quick transactions? This will allow you to play without having to confirm every action.
          </p>
          {error && (
            <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={handleEnable}
              disabled={isEnabling}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2c5282',
                color: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: isEnabling ? 0.7 : 1
              }}
            >
              {isEnabling ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4a5568',
                color: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Maybe Later
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('menu')
  const { isEnabled, isLoading } = useQuickTransactions()
  const [showPrompt, setShowPrompt] = useState(false)
  
  // Show quick transactions prompt when user connects and hasn't enabled it
  useEffect(() => {
    if (!isLoading && !isEnabled) {
      setShowPrompt(true);
    }
  }, [isLoading, isEnabled]);

  return (
    <div className="app-container">
      {/* Quick Transactions Prompt */}
      {showPrompt && (
        <QuickTransactionsPrompt onClose={() => setShowPrompt(false)} />
      )}

      {/* Current page content */}
      {currentPage === 'menu' && <MainMenu onNavigate={setCurrentPage} />}
      {currentPage === 'playground' && <Playground />}
      {currentPage === 'game' && <Game />}
      
      {/* Back button for non-menu pages (except game page) */}
      {currentPage !== 'menu' && currentPage !== 'game' && (
        <button 
          onClick={() => setCurrentPage('menu')} 
          className="back-button"
        >
          Back to Menu
        </button>
      )}
      
      <MusicPlayer />
    </div>
  );
}

function App() {
  const { user } = useHappyChain()
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Login page
  if (!user) {
    return (
      <div className="app-container login-page">
        <h1>Welcome to Game</h1>
        <ConnectButton />
      </div>
    );
  }

  // Show loading while contracts initialize
  if (isInitializing) {
    return (
      <ContractsProvider onInitialized={() => setIsInitializing(false)}>
        <div className="app-container">
          <LoadingIndicator message="Initializing game..." />
        </div>
      </ContractsProvider>
    );
  }

  // Main app with initialized contracts
  return (
    <ContractsProvider>
      <AppContent />
    </ContractsProvider>
  );
}

export default App
