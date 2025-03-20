import './utils/uuid'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HappyWalletProvider } from '@happy.tech/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HappyWalletProvider>
      <App />
    </HappyWalletProvider>
  </StrictMode>,
)
