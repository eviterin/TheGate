import { useCallback, useEffect, useState } from 'react';
import { readContract, simulateContract, writeContract } from '@wagmi/core';
import { getContractAddress, getContractAbi } from '../utils/contractUtils';
import { loadAbi } from '@happy.tech/core';
import { config } from '../../wagmi';

interface ContractConfig {
    address: `0x${string}`;
    abi: any;
}

const useContractConfig = () => {
    const [contractConfig, setContractConfig] = useState<ContractConfig | null>(null);

    useEffect(() => {
        const init = async () => {
            const address = getContractAddress('SimpleStorage.sol') as `0x${string}`;
            const abi = await getContractAbi('SimpleStorage.sol');
            await loadAbi(address, abi);
            setContractConfig({ address, abi });
        };
        init();
    }, []);

    return contractConfig;
};

export function useSetData() {
    const contractConfig = useContractConfig();
    console.log(contractConfig);

    const setData = useCallback(async (newValue: string) => {
        if (!contractConfig) return null;
        
        try {
            const { request } = await simulateContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'set',
                args: [newValue],
            });

            const hash = await writeContract(config, request);
            return hash;
        } catch (error) {
            console.error('Error setting data:', error);
            return null;
        }
    }, [contractConfig]);

    return { setData };
}

export function useGetData() {
    const contractConfig = useContractConfig();

    const getData = useCallback(async () => {
        if (!contractConfig) return null;

        try {
            const data = await readContract(config, {
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'get',
                args: [],
            });
            return data as string;
        } catch (error) {
            console.error('Error getting data:', error);
            return null;
        }
    }, [contractConfig]);

    return { getData };
} 