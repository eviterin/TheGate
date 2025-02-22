# sesuj playground for jesus

## Install dependencies

```bash
npm install
```

## Run the development server

```bash
npm run dev
```

## Data Architecture

### Game Data
The game uses a shared data approach between client and blockchain:

#### Cards
- Source of truth: `/shared/cards.json`
- Client wrapper: `/src/game/cards.ts`
  - Adds client-specific fields (e.g. image paths)
  - Provides TypeScript types and helper functions

#### Encounters
- Source of truth: `/shared/encounters.json` 
- Client wrapper: `/src/game/encounters.ts`
  - Adds client-specific data (positions, names)
  - Provides TypeScript types and helper functions

The shared JSON files are used by both:
- Client (via TypeScript wrappers)
- Deployment scripts (direct JSON import)

This ensures consistency between client and chain data while allowing client-specific enrichments.
