# Direcciones507 PR #39: controlled Core cutover

Prepared 2026-10-06. This file is a procedure, not authorization to execute production changes. All steps stop on ambiguous evidence or failed checks. Never log passwords, client secrets, session cookies, OAuth codes/state, Google tokens, PINs or OWNER credentials.

## Fixed resources and rollback artifact

- Repository: direcciones507/direcciones507; PR #39 is stacked onto feat/core-auth-session-rbac-20261005, not main.
- Project: amused-enchantment / 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d.
- Production environment: 909fdec4-8930-4405-ae53-6e8fb0d3f901.
- Core service (retain this same ID): b0da9f70-7790-4729-a728-aaa4aa3f571d.
- PostgreSQL service: ce124693-1fef-432f-9824-e315d5cabd9d.
- Rollback deployment: c1563131-f6f4-498c-a91d-0a66184699b8.
- Rollback snapshot: 588ae35a-98d4-4d33-884a-9d21677b714a.
- Rollback image: ghcr.io/railwayapp/function-bun:1.4.0.
- Legacy source: core/runtime/legacy.snapshot.txt; SHA256 including archive final newline: 07546aa3676d52948ff0426b44e8eddbee8cfe32b562043db6eedf7a0ccdb03e.
- Old builder: RAILPACK, V3; deploy runtime V2; start command ./run.sh plus the original source encoded as base64; restart NEVER; sleepApplication true; sfo one replica; no mounted Core volume.
- Preserve current domains and target port 8080. Never move or remove custom domains during this cutover.

Before authorization, record the exact approved PR HEAD and its native PostgreSQL/Docker/compile checks. Re-fetch the live source and verify its archive hash. If production has changed, capture the new baseline and stop; these rollback IDs must not silently be reused for a different baseline.

## 1. Clear independent staging and establish rollback access

Current pending patch 56b81dd9-3a5d-481a-aa41-5299343ec947 contains two shadow variables: AD507_AUTH_SUCCESS_URL and AD507_GOOGLE_REDIRECT_URI. It is unrelated to the Core cutover. Its owner must explicitly resolve/discard it before this procedure; do not accept the environment patch as part of deploying Core. Require pendingWork empty before preparation and after each committed operation.

In ad507-core -> Deployments, confirm c1563131-f6f4-498c-a91d-0a66184699b8 is still available for rollback and capture the current service configuration privately. Retention can expire. Capture source/build/start/healthcheck/root/Dockerfile/restart/sleep/region/network fields, plus variable NAMES and reference expressions; secrets stay in Railway. Stop if rollback artifact/configuration cannot be recovered.

## 2. Recoverable PostgreSQL backup

In Postgres -> Backups, create a fresh manual backup of the existing persistent volume. Wait for completion; record backup ID, creation timestamp, volume ID, size, expiry/retention and restore availability. The older August backup alone is insufficient for this cutover. Confirm recovery permissions and that a restore can be selected. If the account does not permit a new backup, obtain an authorized recoverable logical backup through the established database access path, verify pg_restore listing and a restore into an isolated database, or STOP. Never restore a backup over production as a verification test.

The backup must cover users/roles, foundation ledger and all legacy Residential/OWNER/analytics/Natalie tables. Backup contents belong in private backup storage, never Git or PR attachments.

## 3. SQL preflight: read-only

Use the existing authorized Railway CLI session and installed psql. From the repository checkout:

```sh
railway link --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 --service ce124693-1fef-432f-9824-e315d5cabd9d
railway connect Postgres
```

Do not run railway up against Postgres. If connect cannot open the real database, stop; never create a temporary production service or change network variables to bypass this gate. In psql, disable query echo and use:

```sql
\set ON_ERROR_STOP on
\set ECHO none
BEGIN READ ONLY;
SELECT current_database(), current_user, version();
SELECT table_schema,table_name FROM information_schema.tables
 WHERE table_schema='ad507' AND table_name LIKE '%migration%';
SELECT version,checksum_sha256,description,applied_at,applied_by
 FROM ad507.schema_migrations ORDER BY version;
SELECT to_regclass('ad507.oauth_transactions'),
       to_regclass('ad507.google_identities'),
       to_regclass('ad507.auth_sessions');
SELECT column_name,data_type,is_nullable FROM information_schema.columns
 WHERE table_schema='ad507' AND table_name IN ('users','user_roles','schema_migrations')
 ORDER BY table_name,ordinal_position;
SELECT u.id,u.status,ur.role FROM ad507.users u
 LEFT JOIN ad507.user_roles ur ON ur.user_id=u.id
 WHERE lower(u.email)=lower('ventas@direcciones507.com');
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid IN ('ad507.users'::regclass,'ad507.user_roles'::regclass);
COMMIT;
```

Require the real ledger format to be identified, versions 0000-0004 recorded with verified original execution checksums, 0005 absent and no unexpected 0031 application. Do not compare historical checksums to later edits without identifying their original execution commits. Require all three new relation names NULL: IF NOT EXISTS alone must not conceal an incompatible pre-existing table. Require canonical users UUID PK, case-insensitive unique emails, ACTIVE admin and existing ADMIN role. Record privately the legacy table definitions, row counts and selected non-secret record hashes for postflight; do not select PIN/token/session contents. Stop on mismatch, collision or ambiguity.

This preflight has not been executed as part of the PR review. The stale ledger name in db/migrations/README.md is not authoritative; inspect the actual database and use ad507.schema_migrations only after confirming it.

## 4. Google Cloud configuration (owner action, after separate approval)

In Direcciones507 Production -> Google Auth Platform -> Clients, create/select the Web application client for Direcciones507 and add exactly:

`https://ad507-core-production.up.railway.app/auth/google/callback`

Scopes remain openid email profile. Gmail API being enabled does not require Gmail scopes; request none. Obtain Client ID/Client Secret through the owner's private session; paste the secret directly into Railway's protected variable editor, never chat/Git/logs. Keep External audience and add the test account if the app's current publication/testing state requires it.

Confirm ventas@direcciones507.com is either an authoritative Workspace account (Google returns matching hd) or already linked to its independently verified Google sub. For a non-authoritative email provider, STOP until a separately authorized identity-link procedure verifies ownership and inserts its sub into google_identities. Do not weaken this check to finish the cutover.

## 5. Stage only Core variables

On ad507-core, preserve all legacy variables/reference expressions. Stage:

| Name | Value source |
| --- | --- |
| AD507_GOOGLE_CLIENT_ID | Selected Web OAuth client |
| AD507_GOOGLE_CLIENT_SECRET | Owner's private Google Cloud client secret |
| AD507_GOOGLE_REDIRECT_URI | Exact callback above |
| AD507_AUTH_SUCCESS_URL | /v1/auth/me for initial validation; this is an existing registered route |
| AD507_SESSION_SECRET | Cryptographically random independent secret, at least 32 characters |

AD507_PUBLIC_BASE_URL is optional; if already present its origin must match the callback. Do not reuse the Residential provisioning secret. Success '/' is not used for initial validation because the legacy Core does not serve a general home page. Do not add a redirect to another origin. Avoid an intermediate variable-only deployment: stage with the reviewed Core source/config change, inspect the complete patch, and commit it only at step 8. No unrelated service may be included.

## 6. Execute 0005 and ledger atomically

Checkout the exact approved PR HEAD. Verify migration SHA256 from that checkout and the preflight/backup evidence again. Generate the reviewed atomic psql script without connecting to any database:

```sh
bun core/runtime/scripts/prepare-0005.ts APPROVED_40_CHARACTER_HEAD > /tmp/ad507-0005.psql
```

Replace APPROVED_40_CHARACTER_HEAD with the actual reviewed SHA; the generator rejects anything else. Inspect the generated script and checksum. It assumes ledger versions are precisely 0000 through 0004; if the real preflight finds another format, STOP and adapt/review the generator rather than guessing. It locks the ledger, rechecks 0005 absence/table collisions, applies DDL, checks FK/index postconditions and inserts the checksum/commit in one transaction.

Only after separate production authorization, in the official connected psql session:

```sql
\i /tmp/ad507-0005.psql
```

On any SQL error, immediately issue ROLLBACK and inspect read-only. ON_ERROR_STOP prevents continuing after an error; the transaction ensures schema and ledger commit together. Do not execute the unchanged file with its COMMIT and add a separate ledger INSERT afterward.

No migration execution tool or production connection is invoked by this document. Never mark a migration applied solely because a file exists in Git.

## 7. SQL postflight

In BEGIN READ ONLY, confirm exactly one 0005 ledger record and its checksum equals the exact executed bytes. Inspect columns, primary keys, FK references to ad507.users, unique user binding, expiry indexes and constraints on all three new tables. Compare canonical users/roles and legacy definitions/counts/non-secret hashes against preflight. Require unchanged legacy data/definitions from migration execution. No OAuth identity/session rows should yet have been created. COMMIT. Stop on any difference.

## 8. Merge and switch the existing Core source, after authorization

Reconfirm all checks on the final approved HEAD. PR #39 merges into feat/core-auth-session-rbac-20261005; main is not its current base. Record the resulting merge SHA, verify the tree includes reviewed runtime and 0005, and use that exact merged revision as the release. If main is required operationally, first complete a separately reviewed/approved foundation integration; do not retarget/merge unrelated changes silently.

On the same ad507-core service ID, change source from Function image to direcciones507/direcciones507 on the approved release branch/revision; root directory /core/runtime; Dockerfile Dockerfile relative to that root; start bun server.ts (remove the old ./run.sh override); no pre-deploy migration command; healthcheck /ready; preserve region/replica count/domains/target port and legacy variables. Record the resolved build commit before accepting deployment. If Railway cannot freeze/verify the approved revision, stop. GitHub source attachment may build immediately: use a staged configuration mechanism if supported, otherwise make attachment the final authorized operation after all gates and migration have passed. Never attach source as a preliminary experiment.

Review all pending changes, including staged OAuth variables. Commit only the intended Core changes. Do not create a new service, replace shadow, or attach the repository to Postgres. Keep source autodeploys controlled during validation so later branch pushes cannot change the release under test.

## 9. Wait and validate

Wait for the exact new ad507-core deployment SUCCESS, healthy replicas, no crashes and pendingWork empty. Record deployment ID, resolved Git SHA and image artifact. Timeout, FAILURE/CRASHED, unexpected SHA or /ready failure triggers rollback; do not proceed to physical tests while DEPLOYING.

GET https://ad507-core-production.up.railway.app/health must return 200 ok:true. GET /ready must return 200 with database:true and authConfigured:true. No secrets may appear in responses/logs. Confirm both authorized public/custom-domain AD507 pages still resolve without changing DNS.

In the owner's browser, GET /auth/google/login, complete real Google authentication and land at /v1/auth/me. Require the canonical UUID/email/current roles; existing ADMIN remains assigned only by PostgreSQL. An unprovisioned account must fail and create no user/role. Do not save callback URLs, cookies or authorization codes in screenshots/logs. Confirm scope consent has no Gmail permissions.

POST /auth/logout from a page on the Railway Core origin with credentials and Origin header. Expect 204 and subsequently /v1/auth/me -> 401. Do not use a different-origin frontend for this validation: general session cookies are host-only and no cross-origin general-auth CORS contract is added by this PR.

## 10. Physical legacy smoke and stop conditions

READ-ONLY smoke: open https://direcciones507.com/AD507-0002/ with no PIN, OWNER activation, temporary link generation, QR scan or share action. Verify the existing UI. On an already authorized OWNER device, inspect the previously available page/UI only. Opening a legacy resolver may refresh last_seen metadata; strict zero-write verification must use captured HTTP baselines plus SQL SELECT, not POST access routes. Do not claim a read-only smoke proves new OWNER enrollment/activation; those remain separately authorized functional tests.

Verify existing BUSINESS/Premium public pages, media/navigation links and Apps Script integration response contracts against their captured baseline. Use existing requests/captured evidence for Natalie and analytics contracts. Do not generate Natalie conversations, analytics events, magic-link exchanges or provisioning calls as read-only tests: these write data and/or incur provider usage. If positive live tests are required, obtain scoped authorization and use designated test records. Registered-route negative tests plus byte-faithful extraction and CI are the non-writing compatibility evidence.

Any legacy regression, wrong identity/roles, replay acceptance, token exposure, logout failure, unexpected source SHA or database mismatch triggers immediate rollback. End with a concise verified/pending checklist; do not declare OWNER/Natalie/analytics full live regression passed from static registration alone.

## Exact rollback

1. Cancel the failing new deployment if still building/deploying; stop release autodeploys so a branch push cannot overwrite rollback. Do not remove the Core service or domains.
2. In the existing ad507-core deployment history, select deployment c1563131-f6f4-498c-a91d-0a66184699b8 (snapshot 588ae35a-98d4-4d33-884a-9d21677b714a), then Rollback. This restores its saved image and custom variables. Confirm these IDs immediately before execution; never select an unnamed latest deployment.
3. Inspect settled service config as well as the running artifact. Restore the saved image source ghcr.io/railwayapp/function-bun:1.4.0, exact old ./run.sh encoded-source start command, old root/Dockerfile/healthcheck settings (unset newly added values), RAILPACK V3, V2 runtime, NEVER restart, sleep enabled, sfo one replica and unchanged networking. Disconnect the Git source trigger if rollback did not restore it. If any config differs, stage the saved settings and redeploy that exact identified old artifact only; do not rebuild from the current Git branch.
4. If Railway retention prevents native rollback, STOP unless the captured Function source and full original configuration can be reapplied to this same service through the official Function mechanism. The source can be regenerated from the verified legacy.snapshot.txt after removing only its archival final newline; use the original Function encoding mechanism. Validate its source hash and settings before deployment. This fallback must be rehearsed/verified before beginning cutover if the native rollback option is unavailable.
5. Wait for the old artifact to be live/healthy (SUCCESS after wake, or its established healthy sleeping state), pendingWork empty, and baseline AD507/Residential read-only smoke restored. Old Core does not have the new /health or /ready endpoints: do not require them as old-artifact rollback checks.
6. Leave additive 0005 tables/ledger in place; old code does not use them. Do not drop tables or restore the whole database for an application failure. A PostgreSQL backup restore is reserved for verified data corruption, requires separate authorization and the exact fresh backup ID, with writers stopped to avoid losing later data.

References: Railway CLI link/connect documentation; https://docs.railway.com/deployments/deployment-actions (rollback restores image/custom variables and is retention-limited). Production modifications require separate approval after this runbook's blockers are resolved.
