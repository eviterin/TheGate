# Chainy

## Setup

### Install dependencies
```bash
npm install
```

### Deploy contracts

Modify the `.env` file with your private key (if you're lucky there's one already there preloaded with $HAPPY)

```bash
node scripts/deploy-all.js
```

## Smart Contracts

Chainy is built on a set of modular smart contracts that work together to create a complete blockchain-based card game:

- **[CardLibrary.sol](./contracts/CardLibrary.sol)**: Contains constants for card IDs and utility functions for managing card interactions, including target requirements and reward generation.

- **[Cards.sol](./contracts/Cards.sol)**: Manages the creation, updating, and retrieval of card information, including their attributes like name, description, mana cost, and targeting capabilities.

- **[DeckManager.sol](./contracts/DeckManager.sol)**: Handles deck-related operations such as drawing cards, shuffling, discarding, and managing the movement of cards between hand, draw pile, and discard pile.

- **[GameEncounters.sol](./contracts/GameEncounters.sol)**: Manages enemy encounters, including enemy types, health, intents, damage calculation, healing, and turn processing. This creates the combat experience.

- **[GameState.sol](./contracts/GameState.sol)**: Core game state contract that manages player progress, including health, mana, current floor, deck state, and the overall game flow from starting a run to completion.

- **[VictoryTracker.sol](./contracts/VictoryTracker.sol)**: Tracks player victories, records successful game completions, and provides functions to check win status.


