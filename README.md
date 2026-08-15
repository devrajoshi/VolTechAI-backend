# VolTechAI Backend

This is the NestJS backend microservice built to support the VolTechAI application ecosystem. It safely governs database state, validates pricing directly from PostgreSQL, and orchestrates secure integrations with Stripe.

## Architecture
- **NestJS**: Provides the structured, injectable module ecosystem supporting the REST APIs.
- **Prisma & PostgreSQL**: Robust type-safe data handling for packages, orders, and payment statuses.
- **Stripe**: The core payment integration. The backend controls API secrets, executes `payment_intents` matching verified Postgres prices, and verifies raw webhooks to protect against arbitrary client manipulation.

## Getting Started

### 1. Requirements
Ensure you have Docker to run the database instance:
```bash
docker compose up -d
```

### 2. Configure Environment
Create a `.env` in this directory:
```
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://niral:niral_secret@localhost:5432/voltechai"
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

### 3. Install & Seed
Install dependencies with Bun, execute database schema upgrades, and seed the verified authoritative package catalog.
```bash
bun install
bunx prisma migrate dev
bun run db:seed
```

### 4. Running the Dev Server
```bash
bun run dev
```

The APIs mount on `http://localhost:3001/api`.

## Testing
Run unit tests across Modules and complete end-to-end (E2E) testing against active app interfaces:
```bash
bun run test
bun run test:e2e
```
