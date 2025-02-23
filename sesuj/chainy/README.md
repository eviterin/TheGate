# Chainy

## Setup

### Install dependencies
```bash
npm install
```

### Deploy contracts

Modify the `.env` file with your private key. (todo add it there!)

```bash
node scripts/deploy-all.js
```



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

