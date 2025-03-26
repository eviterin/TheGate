const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

async function verifyDeployment() {
    console.log("\n🔍 Running deployment process verification...");

    describe("Deployment Process Verification", function () {
        it("should successfully run deploy-all.js", async function () {
            // Run the deployment script
            execSync('node scripts/deploy/deploy-all.js', { stdio: 'inherit' });
        });

        it("should create deployed-contract-addresses.json", async function () {
            const filePath = path.join(__dirname, "../artifacts/contracts/deployed-contract-addresses.json");
            expect(fs.existsSync(filePath)).to.be.true;
        });

        it("should have all required contracts deployed", async function () {
            const filePath = path.join(__dirname, "../artifacts/contracts/deployed-contract-addresses.json");
            const deployedContracts = JSON.parse(fs.readFileSync(filePath, "utf8"));
            
            const requiredContracts = [
                "GameState.sol",
                "GameEncounters.sol",
                "VictoryTracker.sol",
                "CardLibrary.sol",
                "DeckManager.sol"
            ];

            for (const required of requiredContracts) {
                expect(deployedContracts.some(c => c.name === required)).to.be.true;
            }
        });

        it("should have valid contract addresses", async function () {
            const filePath = path.join(__dirname, "../artifacts/contracts/deployed-contract-addresses.json");
            const deployedContracts = JSON.parse(fs.readFileSync(filePath, "utf8"));
            
            for (const contract of deployedContracts) {
                expect(ethers.isAddress(contract.address)).to.be.true;
            }
        });

        it("should have valid contract ABIs", async function () {
            const filePath = path.join(__dirname, "../artifacts/contracts/deployed-contract-addresses.json");
            const deployedContracts = JSON.parse(fs.readFileSync(filePath, "utf8"));
            
            for (const contract of deployedContracts) {
                expect(Array.isArray(contract.abi)).to.be.true;
                expect(contract.abi.length).to.be.greaterThan(0);
            }
        });

        it("should have correct contract bytecode", async function () {
            const filePath = path.join(__dirname, "../artifacts/contracts/deployed-contract-addresses.json");
            const deployedContracts = JSON.parse(fs.readFileSync(filePath, "utf8"));
            
            for (const contract of deployedContracts) {
                expect(typeof contract.bytecode).to.equal('string');
                expect(contract.bytecode.startsWith('0x')).to.be.true;
            }
        });
    });
}

module.exports = {
    run: verifyDeployment
}; 