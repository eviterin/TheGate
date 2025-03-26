const { getContractInstances } = require('./test-helper');
const { run: runBasicFlow } = require('./test-basic-flow');

async function main() {
    try {
        console.log("Starting game functionality test suite...");
        
        // Get contract instances from deployed contracts
        const contracts = await getContractInstances();
        
        // Run game functionality tests
        await runBasicFlow(contracts);
        
        console.log("\n✅ Game functionality tests completed successfully!");
    } catch (error) {
        console.error("\n❌ Game functionality tests failed:", error.message);
        process.exit(1);
    }
}

// Run game tests
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 