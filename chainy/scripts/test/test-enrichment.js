const { expect } = require("chai");
const { ethers } = require("hardhat");
const { enrichGameState } = require("./enrich-gamestate");

async function run() {
    console.log("Running contract enrichment tests...");
    
    let gameState;
    let encounters;
    let victoryTracker;
    let owner;
    let player;
    
    beforeEach(async function() {
        // Get signers
        [owner, player] = await ethers.getSigners();
        
        // Deploy contracts
        const GameEncounters = await ethers.getContractFactory("GameEncounters");
        encounters = await GameEncounters.deploy(ethers.constants.AddressZero);
        await encounters.deployed();
        
        const VictoryTracker = await ethers.getContractFactory("VictoryTracker");
        victoryTracker = await VictoryTracker.deploy();
        await victoryTracker.deployed();
        
        const GameState = await ethers.getContractFactory("GameState");
        gameState = await GameState.deploy(encounters.address, victoryTracker.address);
        await gameState.deployed();
        
        // Set up contract relationships
        await encounters.setGameStateContract(gameState.address);
    });
    
    describe("Contract Enrichment", function() {
        it("Should verify contract configuration through enrichment", async function() {
            // This will throw an error if verification fails
            await enrichGameState(gameState, player.address);
        });
    });
}

module.exports = {
    run
}; 