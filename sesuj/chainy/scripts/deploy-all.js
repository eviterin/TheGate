const { execSync } = require('child_process');
const path = require('path');

async function main() {
    console.log('🚀 Starting full deployment process...\n');

    try {
        // Step 1: Compile contracts
        console.log('📝 Compiling contracts...');
        execSync('npx hardhat compile', { stdio: 'inherit' });
        console.log('✅ Contracts compiled successfully\n');

        // Step 2: Deploy main contract
        console.log('🌐 Deploying GameState contract...');
        execSync('node scripts/deploy.js', { stdio: 'inherit' });
        console.log('✅ GameState contract deployed successfully\n');

        // Step 3: Deploy cards
        console.log('🎴 Deploying cards...');
        execSync('node scripts/deploy-cards.js', { stdio: 'inherit' });
        console.log('✅ Cards deployed successfully\n');

        console.log('🎉 Full deployment completed successfully!');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Load environment variables and run
require('dotenv').config();
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 