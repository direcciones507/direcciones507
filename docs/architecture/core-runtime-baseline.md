# Direcciones507 — deployed Core runtime baseline

This document records the verified structural baseline of the production `ad507-core` Railway Function before the PostgreSQL Core migration is enabled.

It intentionally does **not** copy secrets, environment-variable values, PIN hashes, OWNER credentials, OAuth tokens or customer data.

## Verified production service

- Railway service: `ad507-core`
- Runtime: Bun
- Database access: PostgreSQL through `DATABASE_URL`
- Current Railway source type: Railway Function (single TypeScript source)
- Current source status at capture: deployed source, no staged code replacement

## Existing responsibilities that must remain functional

The current Core already owns production behavior for:

- Natalie controlled session/conversation/query flows;
- first-party business analytics event ingestion and private summaries;
- analytics magic-link/session access;
- Residential provisioning;
- Residential QR scan and PIN verification;
- Residential temporary sharing;
- Residential OWNER activation/enrollment/device access/revocation;
- public AD507 page resolution/rendering path.

These responsibilities must not be removed or behaviorally rewritten as part of the first PostgreSQL public-address read implementation.

## Confirmed legacy dependencies

### Business validation

Current public/business validation calls the Apps Script master endpoint and can wait up to approximately 7 seconds before treating the upstream as unavailable.

This is a migration target. For a migrated BUSINESS/PLACE record, the future Core read path must resolve directly from PostgreSQL and must not synchronously call Apps Script.

### Public template

Current dynamic public-page rendering fetches `ad507.template.html` from GitHub with an external network request and timeout.

This is a later performance/migration target. It must not be removed until the replacement rendering/publication path has been physically verified.

### Runtime DDL

The deployed Function currently performs multiple `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE`, index creation and some compatibility updates during startup.

The new versioned migration system is intended to move schema evolution out of runtime progressively. Do not remove existing startup compatibility DDL until the corresponding versioned migrations have been applied and verified in the production database.

## Safe implementation boundary

The first executable Core change must be additive:

1. Preserve all existing routes and handlers byte-for-behavior as far as practical.
2. Add a PostgreSQL repository/read function for the new `ad507_addresses` model only after the versioned schema exists in the target database.
3. Add the new `/v1/addresses/:code` route behind a disabled-by-default server-side feature gate.
4. With the gate disabled, no existing request path may change behavior.
5. Do not route public `/AD507-*` traffic through the new repository yet.
6. Do not change Residential resolution or OWNER/PIN logic.
7. Do not remove Apps Script validation yet.
8. Do not remove GitHub template fetching yet.
9. Do not execute migration SQL from application startup.
10. Enable/route production traffic only after schema application, internal endpoint tests and physical regression tests are green.

## Feature gate

Recommended environment contract:

`AD507_POSTGRES_PUBLIC_READ_ENABLED=false`

Absence of the variable must behave as `false` (fail closed).

When false:

- `/v1/addresses/:code` may return `404 ROUTE_DENIED` or remain unregistered;
- existing AD507 pages continue on the legacy path;
- analytics and Residential behavior remain unchanged.

When eventually true after explicit approval:

- only the new API route becomes available initially;
- public page routing still remains legacy until a separate cutover approval.

## PostgreSQL namespace compatibility

The deployed Core's existing production tables live under the `ad507` PostgreSQL schema. Before applying the new migrations, the migration files must be reviewed/adjusted so the new foundation objects use the intended production namespace consistently. Do **not** apply the current draft migrations to production until this namespace check is closed.

## No-downtime rule

At every step, existing public AD507 URLs, analytics, Natalie and Residential/OWNER must continue operating. Any change that cannot preserve that condition belongs in the final controlled cutover window with backup and rollback prepared.
