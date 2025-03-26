const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let encountersArtifact;
let gameStateArtifact;
let victoryTrackerArtifact;
let cardLibraryArtifact;
let deckManagerArtifact;

async function loadArtifacts() {
    // Read the contract artifacts
    const encountersPath = path.join(__dirname, '../artifacts/contracts/GameEncounters.sol/GameEncounters.json');
    const gameStatePath = path.join(__dirname, '../artifacts/contracts/GameState.sol/GameState.json');
    const victoryTrackerPath = path.join(__dirname, '../artifacts/contracts/VictoryTracker.sol/VictoryTracker.json');
    const cardLibraryPath = path.join(__dirname, '../artifacts/contracts/CardLibrary.sol/CardLibrary.json');
    const deckManagerPath = path.join(__dirname, '../artifacts/contracts/DeckManager.sol/DeckManager.json');

    encountersArtifact = JSON.parse(fs.readFileSync(encountersPath));
    gameStateArtifact = JSON.parse(fs.readFileSync(gameStatePath));
    victoryTrackerArtifact = JSON.parse(fs.readFileSync(victoryTrackerPath));
    cardLibraryArtifact = JSON.parse(fs.readFileSync(cardLibraryPath));
    deckManagerArtifact = JSON.parse(fs.readFileSync(deckManagerPath));
}

async function deployVictoryTracker(wallet) {
    console.log('Deploying VictoryTracker contract...');
    
    const factory = new ethers.ContractFactory(
        victoryTrackerArtifact.abi,
        victoryTrackerArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('VictoryTracker contract deployed to:', deployedAddress);
    
    appendToDeployedContracts({
        name: 'VictoryTracker.sol',
        address: deployedAddress,
        abi: victoryTrackerArtifact.abi
    });

    return deployedAddress;
}

async function deployEncounters(wallet) {
    console.log('\n📝 Deploying GameEncounters contract...');
    
    const factory = new ethers.ContractFactory(
        encountersArtifact.abi,
        encountersArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('✅ GameEncounters deployed to:', deployedAddress);
    
    appendToDeployedContracts({
        name: 'GameEncounters.sol',
        address: deployedAddress,
        abi: encountersArtifact.abi
    });

    return contract;
}

async function deployGameState(wallet, encountersAddress, victoryTrackerAddress) {
    console.log('\n📝 Deploying GameState contract...');
    
    const factory = new ethers.ContractFactory(
        gameStateArtifact.abi,
        gameStateArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy(encountersAddress, victoryTrackerAddress);
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('✅ GameState deployed to:', deployedAddress);
    
    appendToDeployedContracts({
        name: 'GameState.sol',
        address: deployedAddress,
        abi: gameStateArtifact.abi
    });

    return contract;
}

async function deployCardLibrary(wallet) {
    console.log('\n📝 Deploying CardLibrary library...');
    
    const factory = new ethers.ContractFactory(
        cardLibraryArtifact.abi,
        cardLibraryArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('✅ CardLibrary deployed to:', deployedAddress);
    
    appendToDeployedContracts({
        name: 'CardLibrary.sol',
        address: deployedAddress,
        abi: cardLibraryArtifact.abi
    });

    return contract;
}

async function deployDeckManager(wallet, cardLibraryAddress) {
    console.log('\n📝 Deploying DeckManager library...');
    
    const factory = new ethers.ContractFactory(
        deckManagerArtifact.abi,
        deckManagerArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('✅ DeckManager deployed to:', deployedAddress);
    
    appendToDeployedContracts({
        name: 'DeckManager.sol',
        address: deployedAddress,
        abi: deckManagerArtifact.abi
    });

    return contract;
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
    console.log('🚀 Starting deployment process...\n');

    try {
        // Step 1: Load artifacts
        await loadArtifacts();

        // Connect to network using environment variables
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        
        // Load your wallet using private key from .env
        const privateKey = process.env.PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log(`Deploying to ${process.env.CHAIN_NAME} (Chain ID: ${process.env.CHAIN_ID})`);
        console.log("Deploying from address:", wallet.address);

        // Step 2: Deploy libraries first
        const cardLibrary = await deployCardLibrary(wallet);
        const cardLibraryAddress = await cardLibrary.getAddress();

        const deckManager = await deployDeckManager(wallet, cardLibraryAddress);
        const deckManagerAddress = await deckManager.getAddress();

        // Step 3: Deploy VictoryTracker contract
        const victoryTracker = await deployVictoryTracker(wallet);
        const victoryTrackerAddress = await victoryTracker.getAddress();

        // Step 4: Deploy GameEncounters contract
        const encounters = await deployEncounters(wallet);
        const encountersAddress = await encounters.getAddress();

        // Step 5: Deploy GameState contract with all dependencies
        const gameState = await deployGameState(wallet, encountersAddress, victoryTrackerAddress);
        const gameStateAddress = await gameState.getAddress();

        // Step 6: Update GameEncounters with GameState address
        console.log('\n📝 Updating GameEncounters with GameState address...');
        const tx = await encounters.setGameStateContract(gameStateAddress);
        await tx.wait();
        console.log('✅ GameEncounters updated with GameState address');

        console.log('\n🎉 Deployment completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Deployment process failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 