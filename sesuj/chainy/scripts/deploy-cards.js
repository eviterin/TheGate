const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

// Read the contract artifacts
const cardsPath = path.join(__dirname, '../artifacts/contracts/Cards.sol/Cards.json');
const cardsArtifact = JSON.parse(fs.readFileSync(cardsPath));

async function deployCards(wallet) {
    console.log('Deploying Cards contract...');
    
    const factory = new ethers.ContractFactory(
        cardsArtifact.abi,
        cardsArtifact.bytecode,
        wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log('Cards contract deployed to:', deployedAddress);
    
    // This saves both the address and ABI to deployed-contract-addresses.json
    appendToDeployedContracts({
        name: 'Cards.sol',
        address: deployedAddress,
        abi: cardsArtifact.abi
    });

    await initializeCards(contract);
    return deployedAddress;
}

async function initializeCards(contract) {
    console.log('Initializing cards...');
    
    const initialCards = [
        {
            numericId: 1,
            id: 'explodicate',
            name: 'Strike',
            description: 'Deal 6 damage.',
            manaCost: 1,
            targeted: true
        },
        {
            numericId: 2,
            id: 'preach',
            name: 'Defend',
            description: 'Gain 6 block.',
            manaCost: 1,
            targeted: false
        },
        {
            numericId: 3,
            id: 'fortify_faith',
            name: 'Pommel Strike',
            description: 'Deal 7 damage. Draw a card.',
            manaCost: 1,
            targeted: true
        },
        {
            numericId: 4,
            id: 'fasting',
            name: 'Cleave',
            description: 'Deal 8 damage to ALL enemies.',
            manaCost: 2,
            targeted: false
        },
        
    ];

    for (const card of initialCards) {
        console.log(`Adding card: ${card.name}`);
        const tx = await contract.addCard(
            card.id,
            card.name,
            card.description,
            card.manaCost,
            card.targeted
        );
        await tx.wait();
    }

    console.log('Cards initialized successfully');
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

    // Deploy Cards contract
    await deployCards(wallet);
}

// Load environment variables and run
require('dotenv').config();
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 