# Radar 0021 — production execution and next ownership block

## Applied database change

User authorized migration 0021 through CORE after backup and restoration verification.
Applied at **2026-11-20 12:51:45 UTC (07:51:45 Panamá)** through the authenticated
Railway Postgres console in the existing production project. No application startup
or public request executed DDL. No service, database credentials or network rules changed.

- Exact source commit: `c756572fa18ab1a95cba4c5de5fef87ccbbca5d6`.
- Source: `db/migrations/0021_radar_registration_profiles.sql`, byte-identical to
  `core/runtime/radar/registration-profiles.sql`.
- SHA-256: `2280716b6435b69b76b81c4882d1d4013b704ae225e06a767461aefd5da17908`.
- All seven workflows at that source commit were checked once and were successful;
  their approved tests were not rerun locally.

## Backup and restoration

Created a fresh custom-format logical backup using the existing database-local
administrative identity; `pg_restore --list` succeeded, then a complete restore with
`--exit-on-error --no-owner --no-privileges` succeeded into a separate database.
No restoration overwrote production.

- Backup: `/var/lib/postgresql/data/pgdata/radar-0021.eoZGY6/database.dump`.
- Size: **721944 bytes**.
- SHA-256: `d009b38d46b5d4d9802e5867da2c21a17c54f334eebd95f98ab6b092c9228088`.
- Isolated restoration: `radar_0021_restore_20261120_124904`.
- Backup inventory, exact SQL, guarded execution SQL, rehearsal log and production
  log retained in the same directory with restricted directory permissions.
- This logical backup is stored on the existing Postgres persistent volume. It is
  not a new offsite backup or a claim of point-in-time recovery coverage.

## Rehearsal and production safeguards

The guarded execution was rehearsed on the restored database before production.
The reviewed migration body ran inside one repeatable-read transaction, with a
five-second lock timeout, thirty-second statement timeout and exclusive ledger lock.
The guard required 25 existing ledger entries, the expected checksum for 0020,
and absence of 0021 and its table. A repeated execution fails closed.

Before and after the migration body, counts and sorted row digests were compared
for all **56 existing ad507/radar tables**, including the prior ledger, users,
roles, orders and ownership tables. All remained unchanged. This comparison uses
one transaction snapshot; it does not claim to freeze unrelated application traffic.
Postconditions required an empty profile table, both foreign keys and the account
index before recording 0021 and committing.

Production read-back confirmed:

- ledger: **26 entries**, with the exact 0021 checksum;
- Radar: **10 tables**;
- `radar.registration_profiles`: **0 rows**, primary key, two foreign keys and
  JSON object/size constraint present;
- `https://direcciones.lat/health`: `{"ok":true,"service":"ad507-core"}` before
  and after execution;
- Postgres remains online, no recent failed deployments; application deployment
  remains `799dd888-7393-4a6e-8cdd-b2f8d231fba5`.

No customers, owners, roles or orders were created by migration verification.
The new registration gate remains unset/closed. No application merge/deploy occurred.

## Ownership implementation prepared after the migration

The existing CORE panel now has a gated Radar section for named ownership requests,
verified owners and historical unpublished establishments. It reuses existing stores,
CORE authentication and protected moderation actions. Operators no longer need to
type account or establishment identifiers in this new section. Old Radar controls
are retained until the new section is validated, so access to older pending items
is not lost. New ordinary registrations continue their existing automatic publication.

Declared owners can request voluntary verification from their existing client panel.
The request derives account identity from the session, sends no identity documents
or evidence files, and grants no ownership. Instructions retain private evidence,
manual review in 48–72 hours and independence from payments. Identity/fiscal capture
remains excluded pending the previously agreed privacy requirements.

Approval requires ADMIN and explicit evidence-reviewed confirmation; approval and
revocation each write their decision to the existing `ad507.audit_log` in the same
SQL statement as the ownership mutation. Audit failure rolls the mutation back.
The audit stores actor, establishment and affected account, not video/document content.

Five new focused tests passed locally, including PGlite SQL tests for atomic audit
rollback, session-account isolation, role/origin/gate rejection, safe text rendering,
explicit approval confirmation and the voluntary request payload. The new modules
and test also passed a targeted TypeScript check. The five tests ran under Node's
test runner after TypeScript transpilation; CI runs their original Bun test source.

**Not deployed or enabled.** `RADAR_CORE_ADMIN_ENABLED` defaults closed and requires
the existing Radar, ownership and business-detail gates. Browser acceptance with
real CORE sessions and CI on the new commit remain pending. Keep
`RADAR_REGISTRATION_PROFILES_ENABLED` closed until the owner flow is validated.
Do not remove old Radar administration before validating the CORE replacement.
Editing/withdrawal, real Google/email acceptance and other checklist #317 points
remain open; tests with synthetic identities do not close those production checks.
