const { execSync } = require('child_process');
const path = require('path');

async function runStep(name, command) {
    console.log(`\n📝 ${name}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${name} completed successfully`);
        return true;
    } catch (error) {
        console.error(`❌ ${name} failed:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting full deployment process...\n');

    try {
        // Step 1: Compile contracts
        if (!await runStep(
            'Compiling contracts',
            'npx hardhat compile'
        )) throw new Error('Compilation failed');

        // Step 2: Deploy main contract
        if (!await runStep(
            'Deploying GameState contract',
            'node scripts/deploy.js'
        )) throw new Error('GameState deployment failed');

        // Step 3: Deploy cards
        if (!await runStep(
            'Deploying cards',
            'node scripts/deploy-cards.js'
        )) throw new Error('Cards deployment failed');

        console.log('\n🎉 Full deployment completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Deployment process failed:', error.message);
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