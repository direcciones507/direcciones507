# Direcciones507 consolidated Core

Canonical entrypoint: `core/runtime/server.ts`. Runtime: Bun 1.4.0; PostgreSQL client: postgres 3.4.7, resolved by committed bun.lock. Railway must eventually build the Dockerfile with root directory `core/runtime`. No Railway change is part of this PR.

## Faithful extraction

`legacy.snapshot.txt` is the production ad507-core Function captured from deployed source at deployment c1563131-f6f4-498c-a91d-0a66184699b8 on 2026-10-06. SHA256 of the committed capture (including final newline): 07546aa3676d52948ff0426b44e8eddbee8cfe32b562043db6eedf7a0ccdb03e.

`legacy.ts` differs only by the three deterministic string replacements checked by `scripts/check-legacy.ts`: export the server startup, call the extension router first, close the exported function. All legacy handlers, SQL, PIN/OWNER/session rules, CORS, Natalie, analytics, Apps Script validation and GitHub public template loading remain identical. The snapshot is an archival input, not a runnable entrypoint. `server.ts` is the only supported start command.

## General Google identity

`general-auth.ts` adapts the existing auth.ts/google-auth.ts implementation from base commit 4cd04ade4ff49ca6d8474e2b1a86d29d1404e85c to the active Core's postgres client. It preserves the public OAuth route contract. Authentication never creates users, plans or roles. `/v1/auth/me` reads the ACTIVE canonical user and current roles each time. Existing ADMIN is checked only on `/v1/admin/session-check`. Product capabilities remain in PostgreSQL; legacy product routes retain their established independent access rules.

State and cookie binding are random 256-bit values; their hashes and a PKCE S256 verifier are stored in PostgreSQL for 10 minutes. Atomic consumption prevents cross-replica replay and happens before Google exchange, including provider denial/failure. The cookie is cleared on callback failure and success. Google tokens exist only during the server-side exchange; no access/refresh token is persisted or returned. PKCE is defense in depth alongside the confidential client secret.

Identity is durably linked using Google sub. Initial automatic linking requires an existing ACTIVE canonical user plus an authoritative Google email (gmail.com or matching Workspace hd). For other email providers, first linking requires separate, verified operator provisioning of google_identities; no automatic third-party email takeover is allowed. Changed email or disabled/blocked users fail closed. Google never grants ADMIN.

Sessions retain HMAC signing and HttpOnly/Secure/SameSite=Lax cookies, with eight-hour expiration; new opaque session IDs are stored as hashes in PostgreSQL. Logout requires same-origin Origin, revokes the database session and clears the cookie. A copied cookie no longer authenticates after logout. Existing Residential/OWNER and analytics cookies are unaffected.

Success URL is required, validated server-side and restricted to the callback's HTTPS origin. Client redirect parameters are rejected. Railway TLS termination is supported only for the configured host with forwarded HTTPS; request input never supplies redirect destinations.

## Configuration (names only)

General auth: AD507_GOOGLE_CLIENT_ID, AD507_GOOGLE_CLIENT_SECRET, AD507_GOOGLE_REDIRECT_URI, AD507_AUTH_SUCCESS_URL, AD507_SESSION_SECRET (at least 32 characters).

Existing Core: DATABASE_URL, PORT, OPENAI_API_KEY, AD507_RESIDENTIAL_PROVISIONING_SECRET, AD507_OPENAI_MODEL, AD507_REASONING_EFFORT, AD507_OPENAI_MAX_OUTPUT_TOKENS, AD507_OPENAI_MAX_ESTIMATED_COST_USD. Existing defaults/guards remain unchanged. AD507_PUBLIC_BASE_URL is optional for auth; if supplied its origin must match the callback origin.

Proposed callback: https://ad507-core-production.up.railway.app/auth/google/callback.

Scopes: openid email profile. Gmail is deliberately excluded. No Google Cloud configuration is changed in this phase. Missing auth config returns 503 for auth while legacy routes remain available. `/health` is liveness; `/ready` requires the canonical auth tables and valid auth config.

## Migration and rollback boundary

New migration: db/migrations/0005_general_google_auth.sql. Additive, transactional, idempotent: oauth_transactions, google_identities, auth_sessions with references to canonical users. No old migration is edited, no roles are assigned, and application startup does not execute 0005. Existing legacy startup DDL is retained verbatim.

Apply 0005 only in a later authorized production preflight with the existing checksum/ledger procedure. Rollback first restores the saved Railway Function configuration/source; the additive tables may safely remain unused. Full schema reversal is possible by removing these three new tables in dependency order after sessions are revoked, traffic is stopped and backups are confirmed; no destructive down migration runs automatically. Expired/consumed transaction and expired session retention requires a later maintenance policy.

## Validation and next gate

Run `bun install --frozen-lockfile`, `bun run check:legacy`, `bun test tests`. Tests use a disposable PostgreSQL cluster by default or a local-only AD507_TEST_DATABASE_URL. Only Google HTTP requests are mocked. Never point the suite at production: it provisions test users and exercises status changes. CI uses PostgreSQL 18.1 over TCP.

Local sandbox validation uses a PostgreSQL WASM engine (PGlite 0.5.8) with pgcrypto and pglite-socket 0.2.11 over TCP because OS user switching is prohibited. This validates actual SQL and the production postgres driver but does not replace the native PostgreSQL CI gate.

Before production: require native CI green, PR review, production backup/preflight/0005 ledger verification, exact config/source rollback capture, credentials configured separately, real Google roundtrip and physical Residential/OWNER regression. No merge, deploy, variable change, source switch, domain routing change or Gmail expansion is authorized by this PR.
