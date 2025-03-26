const { expect } = require("chai");
const { ethers } = require("hardhat");

async function run(contracts) {
    console.log("\n🔍 Running deployment verification tests...");

    describe("Contract Deployment Verification", function () {
        it("should have all required contracts deployed", async function () {
            expect(contracts.gameState).to.exist;
            expect(contracts.encounters).to.exist;
            expect(contracts.victoryTracker).to.exist;
        });

        it("should have correct contract relationships", async function () {
            // Check GameEncounters has correct GameState address
            const gameStateAddress = await contracts.encounters.gameStateContract();
            expect(gameStateAddress).to.equal(await contracts.gameState.getAddress());

            // Check GameState has correct dependencies
            const encountersAddress = await contracts.gameState.encountersContract();
            const victoryTrackerAddress = await contracts.gameState.victoryTrackerContract();
            
            expect(encountersAddress).to.equal(await contracts.encounters.getAddress());
            expect(victoryTrackerAddress).to.equal(await contracts.victoryTracker.getAddress());
        });

        it("should have correct contract ownership", async function () {
            const [owner] = await ethers.getSigners();
            
            // Check GameState ownership
            const gameStateOwner = await contracts.gameState.owner();
            expect(gameStateOwner).to.equal(owner.address);

            // Check GameEncounters ownership
            const encountersOwner = await contracts.encounters.owner();
            expect(encountersOwner).to.equal(owner.address);

            // Check VictoryTracker ownership
            const victoryTrackerOwner = await contracts.victoryTracker.owner();
            expect(victoryTrackerOwner).to.equal(owner.address);
        });

        it("should have correct initial states", async function () {
            // Check GameState initial state
            const playerCount = await contracts.gameState.getPlayerCount();
            expect(playerCount).to.equal(0);

            // Check VictoryTracker initial state
            const totalVictories = await contracts.victoryTracker.getTotalVictories();
            expect(totalVictories).to.equal(0);

            // Check GameEncounters initial state
            const encounterCount = await contracts.encounters.getEncounterCount();
            expect(encounterCount).to.equal(0);
        });
    });
}

module.exports = {
    run
}; 