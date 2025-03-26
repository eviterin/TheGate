const { execSync } = require('child_process');

async function main() {
    try {
        console.log("Starting complete test suite...");
        
        // First run deployment
        console.log("\n=== Running Deployment ===");
        execSync('node scripts/deploy/run-deploy.js', { stdio: 'inherit' });
        
        // Then verify deployment
        console.log("\n=== Verifying Deployment ===");
        execSync('node scripts/test/test-deploy.js', { stdio: 'inherit' });
        
        // Finally run game functionality tests
        console.log("\n=== Running Game Functionality Tests ===");
        execSync('node scripts/test/test-game.js', { stdio: 'inherit' });
        
        console.log("\n✅ All test suites completed successfully!");
    } catch (error) {
        console.error("\n❌ Test suite failed:", error.message);
        process.exit(1);
    }
}

// Run all test suites
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 