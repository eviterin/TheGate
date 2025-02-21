const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { enrichGameState } = require('./enrich-gamestate');

// Read the contract artifacts
const gameStatePath = path.join(__dirname, '../artifacts/contracts/GameState.sol/GameState.json');
const gameStateArtifact = JSON.parse(fs.readFileSync(gameStatePath));

async function deployGameState(wallet) {
    console.log('Deploying GameState contract...');
    
    const factory = new ethers.ContractFactory(
        gameStateArtifact.abi,
        gameStateArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('GameState contract deployed to:', deployedAddress);
    
    // Save both the address and ABI
    appendToDeployedContracts({
        name: 'GameState.sol',
        address: deployedAddress,
        abi: gameStateArtifact.abi
    });

    // Enrich the contract with encounter data
    await enrichGameState(contract, wallet.address);

    return deployedAddress;
}

function appendToDeployedContracts(contractInfo) {
    const dirPath = path.join(__dirname, "../artifacts/contracts");
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, "deployed-contract-addresses.json");
    let deployedContracts = [];

    if (fs.existsSync(filePath)) {
        deployedContracts = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    // Remove any previous deployments of the same contract
    deployedContracts = deployedContracts.filter(contract => contract.name !== contractInfo.name);
    
    // Add the new deployment
    deployedContracts.push(contractInfo);
    
    fs.writeFileSync(filePath, JSON.stringify(deployedContracts, null, 2));
    console.log("Deployment info saved to:", filePath);
}

async function main() {
    // Connect to HappyChain Sepolia
    const provider = new ethers.JsonRpcProvider("https://happy-testnet-sepolia.rpc.caldera.xyz/http");
    
    // Load your wallet using private key from .env
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log("Deploying from address:", wallet.address);

    // Deploy GameState contract
    await deployGameState(wallet);
}

// Load environment variables and run
require('dotenv').config();
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 