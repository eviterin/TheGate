# Shared Data Files

This directory contains shared data files ([cards.json](./cards.json) and [encounters.json](./encounters.json)) used by both the smart contracts and the client application.

## On-Chain vs. Client-Side Data

The most important concept to understand is the separation between data that must be on-chain and data that can be handled by the client:

### On-Chain Data
- Core game mechanics (damage values, health, mana costs)
- Game state (player health, deck composition)
- Win conditions and rules

### Client-Side Data
- Visual elements (card art, animations)
- UI positioning (enemy placement on screen)
- Sound effects and visual feedback

## Why This Matters

This separation allows for:
1. **Reduced gas costs** - Storing only essential data on-chain significantly lowers transaction fees and deployment costs
2. **Greater flexibility for client developers** - UI/UX can be customized without modifying smart contracts
3. **Improved scalability** - The blockchain remains lean while the client can handle increasingly complex visuals
4. **Parallel development** - Frontend and blockchain teams can work independently with clear boundaries
5. **Future-proofing** - Visual and UX improvements can be made without requiring contract migrations or updates

## Automatic Updates

These shared files serve as a single source of truth with automatic integration:

- **Client-side**: Updates to these files are automatically loaded by the client application on startup, ensuring the UI always reflects the latest data without requiring code changes.

- **On-chain data**: The deployment scripts automatically extract the relevant on-chain data from these files during contract deployment, ensuring consistency between what players see and what the blockchain processes.

This automation means you can modify game content (add cards, adjust encounters) by simply updating these JSON files, and both the client and blockchain will stay in sync.

## Usage Guidelines

When developing:
- Smart contracts should only rely on the data marked as "chainData" or core mechanics
- Client applications can use all data, including visual and positioning information
- New client-side properties can be added without affecting the on-chain functionality 