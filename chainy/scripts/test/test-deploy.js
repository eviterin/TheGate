const { run: runDeploymentVerification } = require('./test-deployment');
const { getContractInstances } = require('./test-helper');

async function main() {
    try {
        console.log("Starting deployment verification suite...");
        
        // Verify the deployed contracts
        const contracts = await getContractInstances();
        await runDeploymentVerification(contracts);
        
        console.log("\n✅ Deployment verification completed successfully!");
    } catch (error) {
        console.error("\n❌ Deployment verification failed:", error.message);
        process.exit(1);
    }
}

// Run deployment verification
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 