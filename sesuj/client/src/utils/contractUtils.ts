import deployedContracts from '../../../chainy/artifacts/contracts/deployed-contract-addresses.json';

interface DeployedContract {
    name: string;
    address: string;
    abi: any;
}

//getContractAddress('example.sol') -> 0x1234...5678
export function getContractAddress(contractName: string): string | undefined {
    try {
        console.log('Looking for contract:', contractName);
        console.log('Available contracts:', deployedContracts);
        
        const contract = (deployedContracts as DeployedContract[]).find(c => c.name === contractName);
        
        if (!contract) {
            console.error(`Contract ${contractName} not found in deployed contracts`);
            return undefined;
        }
        
        console.log(`Found contract address: ${contract.address}`);
        return contract.address;
    } catch (error) {
        console.error('Error getting contract address:', error);
        return undefined;
    }
}

//getContractAbi('example.sol') -> abi
export async function getContractAbi(contractName: string) {
    try {
        const contract = (deployedContracts as DeployedContract[]).find(c => c.name === contractName);
        
        if (!contract?.abi) {
            console.error(`ABI not found for contract: ${contractName}`);
            return undefined;
        }
        
        return contract.abi;
    } catch (error) {
        console.error('Error getting contract ABI:', error);
        return undefined;
    }
}