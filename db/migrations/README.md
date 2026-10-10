# Direcciones507 database migrations

This directory contains versioned, forward-only migrations for the modern Direcciones507 Core.

## Safety rules

1. Never run a migration automatically from public web requests or application startup.
2. Never place database credentials, Railway secrets, tokens, PINs, OWNER tokens, or API keys in this repository.
3. Apply migrations only from an authenticated administrative/deployment context.
4. Before production execution, take a database backup/snapshot and verify rollback/recovery access.
5. Check `ad507_schema_migrations` before execution. A migration version is applied at most once.
6. Execute one migration at a time and verify its postconditions before continuing.
7. Foundation migrations must be additive. Do not rename/drop legacy Natalie, Residential/OWNER, analytics, Apps Script compatibility, or other production structures during the parallel migration period.
8. Never make a schema migration depend on an AI model or Natalie.
9. Sensitive audit metadata must be minimized or hashed; do not persist raw credentials or secrets in audit rows.
10. A successful SQL execution is not sufficient: verify existing AD507 public pages, Residential/OWNER flows, Natalie, and analytics after any production schema change.

## Migration ledger

`0000_migration_ledger.sql` creates `ad507_schema_migrations`. The deployment/migration runner records a version only after the corresponding migration has completed successfully and its postconditions have been checked.

Current planned sequence:

- `0000_migration_ledger.sql` — migration ledger only.
- `0001_core_foundation.sql` — additive foundation for users, roles, addresses, ownership, plans/capabilities, media, socials, legal acceptance, audit log, and payment-provider-neutral orders.

## Production status

Files in this directory being present in Git does **not** mean they have been applied to Railway PostgreSQL. Production execution is a separate, explicit step.
