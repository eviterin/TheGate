# The Gate Client

## Getting Started

### Top up your wallet

Use the faucet: https://happy-testnet-sepolia.hub.caldera.xyz/

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

## Game Data
The game uses a shared data approach between client and blockchain:

### Cards
- Source of truth: [cards.json](../shared/cards.json)
- Client wrapper: [cards.ts](./src/game/cards.ts)
  - Adds client-specific fields (e.g. image paths)

### Encounters
- Source of truth: [encounters.json](../shared/encounters.json)
- Client wrapper: [encounters.ts](./src/game/encounters.ts)
  - Adds client-specific data (positions, names)