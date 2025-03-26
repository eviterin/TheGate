const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require('dotenv').config();

async function loadDeployedContracts() {
    const filePath = path.join(__dirname, "../artifacts/contracts/deployed-contract-addresses.json");
    if (!fs.existsSync(filePath)) {
        throw new Error("No deployed contracts found. Please run deployment first.");
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function getContractInstances() {
    // Load deployed contract addresses
    const deployedContracts = await loadDeployedContracts();
    
    // Set up provider with environment variables
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Load wallet using private key from .env
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const contracts = {};
    
    // Create contract instances from deployed addresses
    for (const contract of deployedContracts) {
        const factory = new ethers.ContractFactory(
            contract.abi,
            contract.bytecode,
            wallet
        );
        contracts[contract.name.replace('.sol', '')] = factory.attach(contract.address);
    }
    
    return contracts;
}

module.exports = {
    getContractInstances
}; 