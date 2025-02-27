# The Gate Client

This is the frontend application for The Gate, providing a user interface for the onchain deck-building game. While all game logic exists on the blockchain, the client provides visual representation, animations, and user interactions.

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

## Architecture

The client follows a hybrid architecture that separates blockchain data from client-specific presentation:

### Client-Side Responsibilities
- Rendering game state from blockchain
- Handling user interactions
- Providing visual and audio feedback
- Managing animations and transitions
- Displaying UI elements in appropriate positions

### Data Integration

The client uses shared data files from the [shared directory](../shared) as the source of truth, with client wrappers that add UI-specific information:

- **Cards**: [cards.ts](./src/game/cards.ts) extends the shared card data with visual elements
- **Encounters**: [encounters.ts](./src/game/encounters.ts) adds positioning and visual information

For detailed information about the data architecture and separation between on-chain and client-side data, see the [shared README](../shared/README.md).