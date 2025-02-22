const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the contract artifacts
const encountersPath = path.join(__dirname, '../artifacts/contracts/GameEncounters.sol/GameEncounters.json');
const gameStatePath = path.join(__dirname, '../artifacts/contracts/GameState.sol/GameState.json');
const victoryTrackerPath = path.join(__dirname, '../artifacts/contracts/VictoryTracker.sol/VictoryTracker.json');
const encountersArtifact = JSON.parse(fs.readFileSync(encountersPath));
const gameStateArtifact = JSON.parse(fs.readFileSync(gameStatePath));
const victoryTrackerArtifact = JSON.parse(fs.readFileSync(victoryTrackerPath));

async function runStep(name, command) {
    console.log(`\n📝 ${name}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${name} completed successfully`);
        return true;
    } catch (error) {
        console.error(`❌ ${name} failed:`, error.message);
        return false;
    }
}

async function deployVictoryTracker(wallet) {
    console.log('\n📝 Deploying VictoryTracker contract...');
    
    const factory = new ethers.ContractFactory(
        victoryTrackerArtifact.abi,
        victoryTrackerArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('✅ VictoryTracker deployed to:', deployedAddress);
    
    appendToDeployedContracts({
        name: 'VictoryTracker.sol',
        address: deployedAddress,
        abi: victoryTrackerArtifact.abi
    });

    return contract;
}

async function deployEncounters(wallet) {
    console.log('\n📝 Deploying GameEncounters contract...');
    
    const factory = new ethers.ContractFactory(
        encountersArtifact.abi,
        encountersArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy('0x0000000000000000000000000000000000000000');
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
    console.log('🚀 Starting full deployment process...\n');

    try {
        // Step 1: Compile contracts
        if (!await runStep(
            'Compiling contracts',
            'npx hardhat compile'
        )) throw new Error('Compilation failed');

        // Connect to HappyChain Sepolia
        const provider = new ethers.JsonRpcProvider("https://happy-testnet-sepolia.rpc.caldera.xyz/http");
        
        // Load your wallet using private key from .env
        const privateKey = process.env.PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log("Deploying from address:", wallet.address);

        // Step 2: Deploy VictoryTracker contract
        const victoryTracker = await deployVictoryTracker(wallet);
        const victoryTrackerAddress = await victoryTracker.getAddress();

        // Step 3: Deploy GameEncounters contract
        const encounters = await deployEncounters(wallet);
        const encountersAddress = await encounters.getAddress();

        // Step 4: Deploy GameState contract with GameEncounters and VictoryTracker addresses
        const gameState = await deployGameState(wallet, encountersAddress, victoryTrackerAddress);
        const gameStateAddress = await gameState.getAddress();

        // Step 5: Update GameEncounters with GameState address
        console.log('\n📝 Updating GameEncounters with GameState address...');
        const tx = await encounters.setGameStateContract(gameStateAddress);
        await tx.wait();
        console.log('✅ GameEncounters updated with GameState address');

        // Step 6: Deploy cards
        if (!await runStep(
            'Deploying cards',
            'node scripts/deploy-cards.js'
        )) throw new Error('Cards deployment failed');

        console.log('\n🎉 Full deployment completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Deployment process failed:', error.message);
        process.exit(1);
    }
}

// Load environment variables and run
require('dotenv').config();
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 