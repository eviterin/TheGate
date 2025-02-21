const { encounters, ENEMY_TYPE } = require('./encounters');
const { ethers } = require('ethers');

// Function to enrich the GameState contract with encounter data
async function enrichGameState(contract, deployerAddress) {
    console.log('Enriching GameState contract with encounter data...');

    try {
        // Start a run to initialize the game state
        console.log('Starting a run to verify configuration...');
        const startTx = await contract.startRun({ gasLimit: 1000000 });
        console.log('Waiting for start run transaction...');
        await startTx.wait();

        // Choose a room option to move to first combat floor
        console.log('Moving to first combat floor...');
        const chooseTx = await contract.chooseRoom(1, { 
            gasLimit: 1000000,
            gasPrice: ethers.parseUnits('2', 'gwei')
        });
        console.log('Waiting for choose room transaction...');
        await chooseTx.wait();

        // Wait a bit to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get enemy data from first combat floor (level 1)
        console.log('Checking enemy configuration...');
        const [enemyTypes, enemyMaxHealth] = await contract.getEnemyData(deployerAddress);

        // Get the expected configuration
        const combatConfig = encounters.find(e => e.level === 1).chainData;
        
        // Convert BigNumber arrays to regular number arrays for comparison
        const enemyTypesArray = Array.from(enemyTypes).map(type => Number(type));
        const enemyMaxHealthArray = Array.from(enemyMaxHealth).map(health => Number(health));
        
        // Verify enemy types
        const typesMatch = 
            enemyTypesArray.length === combatConfig.enemyTypes.length &&
            enemyTypesArray.every((type, i) => type === combatConfig.enemyTypes[i]);
        
        if (typesMatch) {
            console.log('✅ Enemy types match configuration');
        } else {
            console.warn('⚠️ Enemy types mismatch:');
            console.warn('  Expected:', combatConfig.enemyTypes);
            console.warn('  Actual:', enemyTypesArray);
        }

        // Verify enemy max health
        const healthMatch = 
            enemyMaxHealthArray.length === combatConfig.enemyMaxHealth.length &&
            enemyMaxHealthArray.every((health, i) => health === combatConfig.enemyMaxHealth[i]);
        
        if (healthMatch) {
            console.log('✅ Enemy max health matches configuration');
        } else {
            console.warn('⚠️ Enemy max health mismatch:');
            console.warn('  Expected:', combatConfig.enemyMaxHealth);
            console.warn('  Actual:', enemyMaxHealthArray);
        }

        // Clean up by abandoning the run
        const abandonTx = await contract.abandonRun({ 
            gasLimit: 1000000,
            gasPrice: ethers.parseUnits('3', 'gwei')
        });
        console.log('Waiting for abandon run transaction...');
        await abandonTx.wait();
        
        console.log('✅ Configuration verification completed');

    } catch (error) {
        console.error('❌ Error during configuration verification:', error);
        throw error;
    }
}

module.exports = {
    enrichGameState
}; 