import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { getContractAddress, getContractAbi } from '../utils/contractUtils';
import { useHappyChain } from '@happy.tech/react';
import LoadingIndicator from '../components/LoadingIndicator';

interface ContractConfig {
    address: `0x${string}`;
    abi: any;
}

interface ContractsState {
    gameState?: ContractConfig;
    cards?: ContractConfig;
    victoryTracker?: ContractConfig;
}

interface ContractsContextType {
    contracts: ContractsState;
    isLoading: boolean;
    error: string | null;
}

const ContractsContext = createContext<ContractsContextType | null>(null);

interface ContractsProviderProps {
  children: ReactNode;
  onInitialized?: () => void;
}

export function ContractsProvider({ children, onInitialized }: ContractsProviderProps) {
    const { user } = useHappyChain();
    const [contracts, setContracts] = useState<ContractsState>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        let mounted = true;
        
        const initializeContracts = async () => {
            if (!user || initialized) return;

            try {
                const contractsToLoad = [
                    { name: 'GameState.sol', key: 'gameState' },
                    { name: 'Cards.sol', key: 'cards' },
                    { name: 'VictoryTracker.sol', key: 'victoryTracker' },
                ];

                const loadedContracts: ContractsState = {};

                for (const contract of contractsToLoad) {
                    if (!mounted) return;
                    const address = getContractAddress(contract.name);
                    const abi = await getContractAbi(contract.name);

                    if (!address || !abi) {
                        throw new Error(`Missing config for ${contract.name}`);
                    }

                    loadedContracts[contract.key as keyof ContractsState] = {
                        address: address as `0x${string}`,
                        abi
                    };
                }

                if (mounted) {
                    setContracts(loadedContracts);
                    setInitialized(true);
                    setError(null);
                    console.log('✅ All contracts initialized');
                    onInitialized?.();
                }
            } catch (error) {
                if (mounted) {
                    console.error('❌ Error initializing contracts:', error);
                    setError(error instanceof Error ? error.message : 'Unknown error loading contracts');
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeContracts();
        return () => { mounted = false; };
    }, [user, initialized, onInitialized]);

    // Memoize the context value
    const contextValue = useMemo(() => ({
        contracts,
        isLoading,
        error
    }), [contracts, isLoading, error]);

    if (!user) {
        return <>{children}</>;
    }

    if (isLoading) {
        return <LoadingIndicator message="Loading game contracts..." />;
    }

    return (
        <ContractsContext.Provider value={contextValue}>
            {children}
        </ContractsContext.Provider>
    );
}

export function useContracts() {
    const context = useContext(ContractsContext);
    if (!context) {
        throw new Error('useContracts must be used within a ContractsProvider');
    }
    return context;
} 