# Direcciones507 — PostgreSQL foundation rollout runbook

## Scope

Controlled application of migrations `0000` through `0003` to the existing production PostgreSQL service. This runbook creates the new Core foundation only. It does **not** migrate existing AD507 records, switch public traffic, change Apps Script, alter the deployed Railway Function, or enable a new API route.

## Non-negotiable availability rule

Existing Direcciones507 pages, Natalie, analytics and Residential/OWNER must remain available throughout this foundation step. If a preflight condition is not satisfied, stop. Do not improvise in production.

## Current verified baseline

- Existing Railway project/environment is production.
- `Postgres` is online with persistent volume storage.
- `ad507-core` already references PostgreSQL via `DATABASE_URL`.
- `n8n` is online.
- No staged Railway changes are pending at the time this runbook was authored.
- Foundation migrations are schema-qualified under `ad507` and CI rejects destructive statements during this phase.

Re-check all baseline items immediately before execution; this document is not evidence that they remain true later.

## Phase A — GO / NO-GO preflight

GO requires all of the following:

1. GitHub PR migration validation is green for the exact commit to be applied.
2. Railway production has no unrelated `pendingWork`.
3. PostgreSQL is online with zero recent failed deployments/crashes.
4. `ad507-core` has no unresolved critical runtime issue.
5. Existing public AD507 smoke checks pass before the database change.
6. Existing Residential/OWNER smoke check passes before the database change.
7. A recoverable database backup/snapshot/export has been created and its identity/time recorded before SQL execution.
8. The exact SQL files and SHA/checksum to be applied are recorded.
9. Operator confirms no unrelated production change is running concurrently.

Any failed item = NO-GO.

## Phase B — backup boundary

Before executing migration SQL:

- Create/confirm a recoverable PostgreSQL backup using the supported Railway/PostgreSQL operational mechanism available at execution time.
- Record UTC timestamp and backup identifier/location without copying credentials into GitHub.
- Do not restart Postgres to create the backup.
- Do not expose Postgres publicly merely to run the migration if an internal/supported execution path exists.

No backup = no production migration.

## Phase C — dry review of migration set

Apply only these reviewed files, in order:

1. `0000_migration_ledger.sql`
2. `0001_core_foundation.sql`
3. `0002_plan_catalog.sql`
4. `0003_plan_capabilities.sql`

Before execution verify:

- all new objects are under `ad507.*`;
- no `DROP`, `TRUNCATE`, `DELETE`, direct `UPDATE`, or foundation-phase `ALTER TABLE` exists;
- foreign keys target the new Core tables only;
- no secret or production credential is embedded;
- catalog/capability seeds are idempotent where designed.

## Phase D — controlled execution

Execution rules:

- Use a database-capable administrative context, not application request traffic.
- Run one migration at a time in numeric order.
- Each migration already owns its transaction boundary. Do not concatenate with unrelated SQL.
- On any SQL error: stop immediately; do not continue to the next migration.
- Do not modify the deployed `ad507-core` Function during this step.
- Do not set `AD507_POSTGRES_PUBLIC_READ_ENABLED=true` during this step.
- Do not change public AD507 routing during this step.

After each successful file, record migration version/checksum in the ledger if the execution mechanism does not do so automatically. Never record a migration as applied before its transaction succeeds.

## Phase E — post-migration database verification

Verify read-only:

- `ad507.schema_migrations` exists;
- new Core tables exist in schema `ad507`;
- existing legacy Core tables still exist;
- plan catalog contains the intended canonical codes;
- capability rows exist for the seeded plans;
- no existing legacy row count unexpectedly changed;
- no existing Residential/OWNER table/schema was altered by the foundation migrations.

Do not insert customer/address migration data yet.

## Phase F — production regression smoke checks

Immediately after schema verification:

1. Check Railway environment health and confirm `pendingWork` is empty.
2. Open/resolve at least one known existing public BUSINESS AD507 through the current production path.
3. Verify its navigation/actions still load through the legacy behavior.
4. Verify one existing Residential URL still follows the existing guest/OWNER security behavior appropriate to the test device.
5. Verify Natalie/analytics endpoints used by current production have no new 5xx spike.
6. Confirm no new Core route or feature gate was enabled.

Foundation is considered successful only if both database checks and application regression checks pass.

## Rollback strategy

These foundation migrations are additive. The preferred incident response is **traffic preservation**, not destructive reverse SQL.

If migration execution fails inside a migration transaction, PostgreSQL rollback should leave that migration's changes unapplied. Stop and diagnose before retrying.

If migrations succeed but an unexpected application regression appears:

1. Keep the new PostgreSQL read feature disabled.
2. Keep all public AD507 traffic on the existing legacy path.
3. Do not drop newly created tables during the incident.
4. If the regression cannot be isolated and the new objects are proven causal, restore the pre-migration database backup through the supported operational process.
5. Re-run legacy public/Residential smoke checks after recovery.

Destructive manual cleanup (`DROP`/mass delete) is not an approved rollback mechanism for this phase.

## Success gate for the next block

Only after this runbook completes green may work proceed to:

- populate/test the PostgreSQL repository layer;
- add the gated `/v1/addresses/:code` implementation;
- migrate a controlled test record;
- compare PostgreSQL output against the legacy source.

Public cutover remains a separate later approval.
