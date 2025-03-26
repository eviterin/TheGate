const { execSync } = require('child_process');

async function main() {
    try {
        console.log("Starting deployment process...");
        execSync('node scripts/deploy/deploy-all.js', { stdio: 'inherit' });
        console.log("\n✅ Deployment completed successfully!");
    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 