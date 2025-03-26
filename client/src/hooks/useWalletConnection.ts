import { connect } from '@wagmi/core';
import { config } from '../../wagmi';
import { happyWagmiConnector, getCurrentUser } from '@happy.tech/core';
import { useCallback, useEffect, useState } from 'react';

// Keep track of connection status globally
let isConnected = false;
let connectionPromise: Promise<any> | null = null;
let lastConnectedAddress: string | null = null;

export function useWalletConnection() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset connection state when component mounts or when user changes
  useEffect(() => {
    // Check if user has changed
    const currentUser = getCurrentUser();
    const currentAddress = currentUser?.address || null;
    
    // If the address is different from last connected address, reset connection state
    if (lastConnectedAddress && currentAddress !== lastConnectedAddress) {
      console.log('User changed, resetting connection state');
      isConnected = false;
      connectionPromise = null;
    }
    
    // Store the current address
    lastConnectedAddress = currentAddress;
    
    return () => {
      // No cleanup needed for event listeners
      // wagmi handles this internally
    };
  }, []);

  const ensureConnected = useCallback(async () => {
    // Get current user to check if logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('No user connected');
    }
    
    // Reset connection state if address changed
    if (lastConnectedAddress && currentUser.address !== lastConnectedAddress) {
      console.log('User changed, resetting connection state');
      isConnected = false;
      connectionPromise = null;
      lastConnectedAddress = currentUser.address;
    }
    
    // If already connected or connecting, don't reconnect
    if (isConnected) {
      return;
    }

    // If connection is in progress, wait for it
    if (connectionPromise) {
      return connectionPromise;
    }

    setConnecting(true);
    setError(null);

    try {
      console.log('Connecting wallet for address:', currentUser.address);
      
      // Create a new connection promise
      connectionPromise = connect(config, { connector: happyWagmiConnector() });
      
      // Wait for connection to complete
      await connectionPromise;
      isConnected = true;
      lastConnectedAddress = currentUser.address;
      
      console.log('Wallet connected successfully');
      return;
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
      throw err;
    } finally {
      connectionPromise = null;
      setConnecting(false);
    }
  }, []);

  return {
    ensureConnected,
    connecting,
    error
  };
} 