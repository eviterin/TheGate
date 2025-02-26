# Chainy Game Smart Contracts

This directory contains the smart contracts for the Chainy game, a blockchain-based card game with turn-based encounters.

## Contract Overview

- **[CardLibrary.sol](./CardLibrary.sol)**: Contains constants for card IDs and utility functions for managing card interactions, including target requirements and reward generation.

- **[Cards.sol](./Cards.sol)**: Manages the creation, updating, and retrieval of card information, including their attributes like name, description, mana cost, and targeting capabilities.

- **[DeckManager.sol](./DeckManager.sol)**: Handles deck-related operations such as drawing cards, shuffling, discarding, and managing the movement of cards between hand, draw pile, and discard pile.

- **[GameEncounters.sol](./GameEncounters.sol)**: Manages enemy encounters, including enemy types, health, intents, damage calculation, healing, and turn processing. This creates the combat experience.

- **[GameState.sol](./GameState.sol)**: Core game state contract that manages player progress, including health, mana, current floor, deck state, and the overall game flow from starting a run to completion.

- **[VictoryTracker.sol](./VictoryTracker.sol)**: Tracks player victories, records successful game completions, and provides functions to check win status.

## Architecture

The contracts work together to create a complete game experience:
- [GameState.sol](./GameState.sol) is the central contract coordinating player actions
- [CardLibrary.sol](./CardLibrary.sol) and [DeckManager.sol](./DeckManager.sol) provide card mechanics
- [GameEncounters.sol](./GameEncounters.sol) handles enemy behavior and combat
- [VictoryTracker.sol](./VictoryTracker.sol) records game completions

The contracts follow a modular design pattern to separate concerns while maintaining interoperability through interfaces and library functions.

For more information about the overall project, see the [chainy README](../README.md).

