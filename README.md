# VolTechAI Backend

This is the NestJS backend microservice built to support the VolTechAI application ecosystem. It safely governs database state, validates pricing directly from PostgreSQL, and orchestrates secure integrations with Stripe.

## Architecture
- **NestJS**: Provides the structured, injectable module ecosystem supporting the REST APIs.
- **Prisma & PostgreSQL**: Robust type-safe data handling for packages, orders, and payment statuses.
- **Stripe**: The core payment integration. The backend controls API secrets, executes `payment_intents` matching verified Postgres prices, and verifies raw webhooks to protect against arbitrary client manipulation.

## Getting Started

### 1. Requirements
Ensure PostgreSQL is running. For the project Compose database, define the
`POSTGRES_*` values in `.env` first, then run:
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
FRONTEND_WEB_URL=http://localhost:3000
FRONTEND_ADMIN_URL=http://localhost:3002
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_TTL_HOURS=12
```

### 3. Install & Seed
Install dependencies, apply the committed migrations, and seed a fresh database.
The CMS seed only creates missing starter records; it does not replace edits made
in the admin app.
```bash
pnpm install
pnpm prisma generate
pnpm db:migrate:deploy
pnpm db:seed
```

### 4. Running the Dev Server
```bash
pnpm dev
```

The APIs mount on `http://localhost:3001/api`.

## Testing
Run unit tests across Modules and complete end-to-end (E2E) testing against active app interfaces:
```bash
pnpm test -- --runInBand
pnpm test:e2e
```
