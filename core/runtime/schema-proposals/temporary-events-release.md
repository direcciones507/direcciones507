# Dirección Temporal — release gate

Price: USD 7.99; 1–30 calendar dates. No permanent codes or directory/sitemap entries.
Default-off flags: `AD507_TEMPORARY_EVENTS_ENABLED` and `AD507_TEMPORARY_PAYMENTS_ENABLED`.

## Identified target (read-only inspection, 2026-11-11)

- Project `amused-enchantment`: `2b6d4e6c-e1d4-471d-a77d-c9bdb711650d`.
- Environment `production`: `909fdec4-8930-4405-ae53-6e8fb0d3f901`.
- Core `ad507-core`: `b0da9f70-7790-4729-a728-aaa4aa3f571d`.
- PostgreSQL service `ce124693-1fef-432f-9824-e315d5cabd9d`.
- Source: `direcciones507/direcciones507`, `main`; Dockerfile `core/runtime/Dockerfile`.
- Domain `https://direcciones.lat`; active deployment at inspection was
  `486b167f-582d-4e07-a7f9-dc54a5c3f348` (SUCCESS). No staged changes.
- No staging environment was present. Never repoint the production service to this branch.

## Before migration

Use an authenticated database connection from the correct Railway environment.
The connected OAuth tools in this session expose variable names, not database credentials;
no live SQL, backup, R2 network roundtrip or provider transaction was performed here.

1. Confirm the project/environment/service IDs above and database name with `SELECT
   current_database(), current_user, inet_server_addr(), version()`; inspect the actual
   schema/ledger. Confirm `ad507.users.id` is UUID and all three event tables are absent.
2. Make a complete custom-format `pg_dump` backup of that exact database. Use
   `pg_restore --list` to validate the archive and restore it to a disposable database;
   record its SHA-256, timestamp, database identity and restore result privately.
   Backup contains personal data: never commit it or attach it to this public repository.
3. Record `SELECT count(*) FROM ad507.users` after the backup. Prepare guarded SQL:
   `bun scripts/prepare-temporary-events.ts DATABASE_NAME USER_COUNT COMMIT_SHA > /secure/temporary-events.sql`.
   The generator performs no network or database writes. Its SQL checks the database,
   user count, UUID auth foundation, absent event tables, ledger and advisory lock.
4. Review the generated SQL and checksum, then apply through one PostgreSQL connection
   with `psql -v ON_ERROR_STOP=1`. It is transactional and has bounded lock/statement
   timeouts. Existing users, addresses, orders and historical records are not updated.
5. Confirm three tables, FK/check constraints and ledger entry `temporary-events-v1`.
   Startup never applies this migration. Repeat execution is rejected.

## Application and payments

Production merge/deploy and live charge enablement require the owner's confirmation.
First validate an isolated deployment with a copied disposable database and test media.
Enable only `AD507_TEMPORARY_EVENTS_ENABLED=true` for form/preview acceptance.

The event checkout requires ALL of:

- `AD507_TEMPORARY_EVENTS_ENABLED=true`.
- `AD507_TEMPORARY_PAYMENTS_ENABLED=true` (new, absent at inspection).
- Existing commercial/Yappy switches and valid production Yappy configuration.
- `AD507_TEMPORARY_YAPPY_IPN_URL=https://direcciones.lat/v1/payments/temporary-events/yappy/ipn`
  (new, absent at inspection). Provider must deliver authenticated V2 IPNs there.
- Existing verified R2 configuration and permission for `temporary-events/*` keys.

No new credentials are invented. Existing Yappy variable names were present, but
values and validity were not verified. Do not alter the permanent-address IPN URL.
The official existing Yappy web component is loaded only when event payments are enabled.
Browser callbacks cannot activate an event. V2 signs order/status/domain rather than
amount/currency; confirmation binds this receipt to the immutable server order (799/USD),
provider reference and environment. A verified paid notification updates order and event
in the same locked transaction. Concurrent/replayed notifications are idempotent.
An ambiguous initialization timeout retains its intent; reconcile it with Yappy support
before any manual reset. No automatic second charge is issued.

Expiry is enforced on every public HTML/photo/QR read using the event timezone, at local
midnight on the second calendar date after its end date. This does not depend on cron.
An expired row may remain ACTIVE in storage, but renders EXPIRED and photo/QR actions
return 410. Public pages never select responsible-name/email/phone columns.

## Rollback

Safest operational rollback: disable both event flags and restore the preceding app
release. Keep event/media/order data for reconciliation. This leaves permanent services
unchanged and does not erase sales.

`temporary-events.rollback.sql` is a DESTRUCTIVE, isolated-schema rollback, tested only
in a disposable local database. It drops only the three new tables, preserves the ledger
and historical tables. Never execute after sales without owner approval and a verified
backup/export. Keep the ledger and record rollback metadata before a reviewed reapply.
