# Chainy

Blockchain component for Jesus game.

## Data Architecture

### Encounters
Currently, encounters are hardcoded in `GameState.sol`. The shared data in `/shared/encounters.json` is used for:
- Testing contract configuration via `enrich-gamestate.js`
- Client-side UI (positions, names)

Future improvements:
- Make GameState.sol configurable from encounters.json during deployment
- Use shared data as single source of truth

### Cards
Card data lives in `/shared/cards.json` and is used by:
- Deployment scripts to initialize the Cards contract
- Client to render cards with UI-specific data

## Development

todo: the .env file!!

### Install dependencies
```bash
npm install
```

### Deploy contracts
```bash
node scripts/deploy-all.js
```

