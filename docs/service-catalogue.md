# Service catalogue rollout

The catalogue lives in PostgreSQL. Owners manage it through the admin app at /services.
Service copy, packages and bundles use the existing admin session and role guards.
Editors cannot read or change the administrative catalogue. Public endpoints expose only published content.

## Deploy in order

1. Back up the target database and check that the backend and frontend point to the same environment.
2. Deploy the backend with the committed migration. This repository uses Prisma 6:
   `pnpm prisma generate`, `pnpm build`, then `pnpm db:migrate:deploy` in the target environment.
   The existing Docker startup already runs migrate deploy. Do not run migrate dev or reset in production.
3. The migration imports 9 services, 21 packages and 8 bundles automatically. No separate catalogue seed is needed.
   Existing package IDs, names, amounts, active states and orders are retained.
   Unknown legacy packages remain unassigned and unpublished until an owner reviews them.
4. Verify GET /api/services and GET /api/catalogue, and the owner-only admin endpoints.
5. Deploy both frontend apps. Set their server BACKEND_API_URL to this backend, ending in /api.
   The web browser checkout still uses NEXT_PUBLIC_BACKEND_API_URL at build time.
6. Check /services, /pricing, /services/seo, /services/app-development, /services/software-development,
   the homepage, footer and sitemap.xml. Existing /services/web-services redirects to the website service;
   /services/digital-marketing-seo redirects to /services/seo.
7. Publish a test change in staging and verify it on a fresh public request before releasing production.

During replacement of an old backend, pause checkout traffic until all instances use the new code:
the previous backend does not understand the new purchase eligibility fields.
Migration and backend deployment must precede the new frontend deployment.

## Commercial behavior

- Imported prices are starting prices or price-on-application, so imported offers are enquiry-only.
- To sell an offer, an OWNER sets a fixed, one-time GBP price, enables direct checkout,
  and publishes both its active package and its service.
- Amounts are stored in integer pence; the admin form accepts pounds.
- The API rejects draft, inactive, monthly, starting-price, POA and invalid amounts before order/Stripe creation.
- Stripe continues to use PaymentIntents with server-controlled amounts. There is no Product/Price synchronization
  or subscription billing in this release. Existing in-progress PaymentIntents keep their original amount.
- A subsequent price/name edit never rewrites an existing order's snapshot.
- Bundles always lead to an enquiry; their components reference real packages. A bundle is hidden if any component
  or its service becomes unavailable. The starter launch bundle offers Starter website/branding with Growth alternatives by consultation.
- DELETE endpoints unpublish (and deactivate packages); they do not delete historical records.
  Slugs cannot change after creation. The migration maintains the two legacy URL aliases.
- Rerunning the ordinary seed cannot overwrite catalogue edits or remove packages.

## API

Public: GET /api/services, GET /api/services/:slug, GET /api/catalogue.

OWNER only: /api/admin/cms/services, /api/admin/cms/packages, /api/admin/cms/bundles.
Each supports GET list, GET /:id, POST, PATCH /:id and DELETE /:id.
POST/PATCH accept the complete validated editor payload. Package IDs in bundle payloads are database IDs;
checkout's existing packageId field continues to contain the package slug.

## Verification

`pnpm test -- --runInBand` runs unit tests including purchase guards.
`CATALOGUE_TEST_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:PORT/catalogue_test pnpm test:catalogue`
runs integration tests against an EMPTY disposable local database only. It never resets an existing database.
The test applies the old migrations, inserts a historical package/order, applies the new migration twice,
and checks authorization, CRUD, publication, aliases, pricing, bundle filtering and seed preservation.
Stripe is mocked; these tests make no payment requests.
