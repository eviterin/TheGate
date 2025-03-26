const { expect } = require("chai");
const { ethers } = require("hardhat");

async function run(contracts) {
    console.log("Running basic game flow tests...");
    
    let owner;
    let player;
    
    beforeEach(async function() {
        // Get signers
        [owner, player] = await ethers.getSigners();
    });
    
    describe("Basic Game Flow", function() {
        it("Should allow starting a new run", async function() {
            await contracts.gameState.connect(player).startRun();
            const data = await contracts.gameState.playerData(player.address);
            expect(data.runState).to.equal(1); // RUN_STATE_WHALE_ROOM
            expect(data.currentFloor).to.equal(0);
            expect(data.maxHealth).to.equal(21);
            expect(data.currentHealth).to.equal(21);
        });
        
        it("Should allow choosing whale room options", async function() {
            await contracts.gameState.connect(player).startRun();
            await contracts.gameState.connect(player).chooseRoom(1); // Extra card draw option
            const data = await contracts.gameState.playerData(player.address);
            expect(data.extraCardDrawEnabled).to.be.true;
            expect(data.runState).to.equal(2); // RUN_STATE_ENCOUNTER
            expect(data.currentFloor).to.equal(1);
        });
        
        it("Should allow abandoning a run", async function() {
            await contracts.gameState.connect(player).startRun();
            await contracts.gameState.connect(player).abandonRun();
            const data = await contracts.gameState.playerData(player.address);
            expect(data.runState).to.equal(0); // RUN_STATE_NONE
            expect(data.currentFloor).to.equal(0);
            expect(data.maxHealth).to.equal(0);
            expect(data.currentHealth).to.equal(0);
        });
    });
}

module.exports = {
    run
}; 