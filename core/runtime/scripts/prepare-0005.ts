import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function prepareMigration0005(releaseCommit: string) {
  if (!/^[a-f0-9]{40}$/.test(releaseCommit)) throw new Error('EXACT_APPROVED_GIT_SHA_REQUIRED');
  const text = readFileSync(new URL('../../../db/migrations/0005_general_google_auth.sql', import.meta.url), 'utf8');
  const checksum = createHash('sha256').update(text).digest('hex');
  if (!/^BEGIN;\s/.test(text) || !/COMMIT;\s*$/.test(text)) throw new Error('MIGRATION_TRANSACTION_BOUNDARY_INVALID');
  const body = text.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
  return `\\set ON_ERROR_STOP on
\\set ECHO none
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE ad507.schema_migrations IN EXCLUSIVE MODE;
DO $guard$
BEGIN
  IF (SELECT count(*) FROM ad507.schema_migrations WHERE version IN ('0000','0001','0002','0003','0004')) <> 5 THEN
    RAISE EXCEPTION 'FOUNDATION_LEDGER_OR_VERSION_FORMAT_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM ad507.schema_migrations WHERE version='0005') THEN
    RAISE EXCEPTION '0005_ALREADY_APPLIED';
  END IF;
  IF to_regclass('ad507.oauth_transactions') IS NOT NULL OR to_regclass('ad507.google_identities') IS NOT NULL OR to_regclass('ad507.auth_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'NEW_AUTH_RELATION_COLLISION';
  END IF;
END
$guard$;
${body}
DO $verify$
BEGIN
  IF (SELECT count(*) FROM pg_constraint WHERE contype='f' AND confrelid='ad507.users'::regclass AND conrelid IN ('ad507.google_identities'::regclass,'ad507.auth_sessions'::regclass)) <> 2 THEN
    RAISE EXCEPTION 'AUTH_CANONICAL_FK_POSTCHECK_FAILED';
  END IF;
  IF to_regclass('ad507.core_oauth_expiry_idx') IS NULL OR to_regclass('ad507.core_auth_sessions_user_idx') IS NULL THEN
    RAISE EXCEPTION 'AUTH_INDEX_POSTCHECK_FAILED';
  END IF;
END
$verify$;
INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by,metadata)
VALUES('0005','${checksum}','General Google identity and revocable sessions',current_user,jsonb_build_object('git_sha','${releaseCommit}'));
COMMIT;
`;
}
// Generates SQL only. Does not connect to a database or execute any statement.
if (import.meta.main) process.stdout.write(prepareMigration0005(process.argv[2] ?? ''));
