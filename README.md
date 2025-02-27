# The Gate

A fully onchain deck-building roguelike game on [HappyChain🤠](https://docs.happy.tech/) where players battle through encounters using strategic card play and deck building.

**Key Features:**
- **Fully Onchain Gameplay**: All game logic, encounters, and rewards exist on the blockchain
- **Deck Building**: Collect cards and build powerful combinations as you progress
- **Strategic Combat**: Plan your moves carefully to overcome increasingly difficult enemies
- **HappyWallet🤠**: Create a wallet seamlessly using social logins (like Gmail)
- **Session Keys**: Authorize the game to play without signing transactions - powered by [HappyChain🤠](https://docs.happy.tech/session-keys)

The Gate demonstrates how complex game mechanics can be implemented entirely onchain while maintaining an engaging user experience. The client is theoretically optional - all game state and logic live on HappyChain.

## Setup Chainy

The contracts in Chainy need to be deployed before the client can run.
Follow the instructions in the [chainy README](/chainy/README.md).

## Setup Clientv

Follow the instructions in the [client README](/client/README.md).

## Architecture

The Gate uses a hybrid architecture with a clear separation between on-chain and client-side data:

### On-Chain Data
- Core game mechanics (damage values, health, mana costs)
- Game state (player health, deck composition)
- Win conditions and rules

### Client-Side Data
- Visual elements (card art, animations)
- UI positioning (enemy placement on screen)
- Sound effects and visual feedback

Shared data files in the [shared directory](/shared) serve as a single source of truth, with automatic integration for both the client and deployment scripts. Read more about [why this separation matters](/shared/README.md) in the [shared README](/shared/README.md).
