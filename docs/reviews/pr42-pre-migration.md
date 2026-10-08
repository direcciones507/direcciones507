# PR #42: pre-migration review

Scope: `feat/client-panel-forms-safe-20261008`, base `feat/admin-ui-20261006`. Draft only. No rollout authorization implied.

## Completed preparation

- Removed the dormant request writer. Every method on `/v1/user/requests` returns 503 before authentication, body parsing or database access. `/v1/user/panel` accepts GET only. No checkout, upload, address update or Residential activation endpoint was added.
- Customer DTO excludes canonical user IDs/roles, ownership roles and internal capabilities. Address and order queries remain parameterized and constrained by the authenticated user's canonical ID; query parameters cannot select another user.
- Cards show name, AD507 code, type, plan and human status. Non-residential owned media is optional and failed images leave no reserved block. Residential media is excluded. Prepared forms cover Residential, Free, Lugar, Premium and Premium Pro without enabling submission.
- Free/Premium/Pro benefit descriptions preserve the existing offer. Premium includes named-code preparation; Pro gallery limit remains five. Lugar requires at least one photo. Empty optional contacts do not produce preview rows.
- Main phone and fixed phone normalize independently. Existing `core/postgres` draft/public repository contracts are retained. `core/runtime/schema-proposals/landline.sql` is an unregistered review proposal, never invoked by a runner; no backfill or existing phone reinterpretation. Tests apply it only to disposable fixture PostgreSQL.
- Template changes are preparatory source changes: larger logo, content-first description, organized gallery and compact action groups at >=768px. Mobile base composition is preserved. Optional fixed call action is hidden by default; sparse data and failed media collapse. Desktop watermark is suppressed.

## Security findings and boundaries

Existing canonical Google OAuth retains state binding, PKCE, verified email, HMAC signatures, database-backed roles/revocation, Secure/HttpOnly/SameSite cookies and logout Origin protection. Residential routes and snapshot are untouched. `currentUser` now validates the configured host/TLS boundary as well, covering callers that bypass the auth router. Panel read API rejects cross-site/foreign Origin and uses a bounded per-user 60/minute in-process limiter. HTML has per-response script nonce CSP, no form submissions, no framing/objects, no-store, no-referrer, nosniff and noindex.

Untrusted text is rendered as text/escaped content; media URLs are created through DOM properties and restricted to HTTPS without credentials. Template external links reject executable protocols. Customer DTO excludes audit/payment internals and Residential media. No secrets, credential files or private logs were introduced.

No uploads are accepted. Local preview checks declared MIME against JPEG/PNG/WebP signatures, nonempty files and the 8 MiB limit. This is screening, **not image decoding**. A future server upload must authorize ownership, enforce request/body limits and per-user quotas, decode and re-encode (strip metadata and reject malformed/polyglot content), then store. Browser validation must never be treated as trusted server evidence. Distributed/edge limits for OAuth and future uploads must be configured and tested before public enablement; this PR does not change the existing authentication operation.

## Future storage seam (not connected)

Panel -> authenticated server validation / image decoding + optimization -> `PreparedMediaStorage.storeOptimized` -> URL + storage key -> ownership-scoped PostgreSQL transaction (`address_media`) -> eligible public Dirección507 rendering. No adapter implementation, R2 account, bucket, credential, secret or network connection exists. Future writes require server-side plan/count checks, CSRF/Origin protection, idempotency, orphan cleanup and explicit rollout authorization. Storage keys and private residential media must not enter customer/public DTOs.

## Remaining mandatory gates

- Authorize/register the landline schema change with backup, version/ledger and rollback review; apply to staging before a separately approved production migration.
- Provision and connect R2 only after approval; implement and exercise trusted decoding/optimization and atomic media persistence.
- Physical mobile/tablet/desktop tests, real Google session/logout and actual media under staging policy. Browser fixture tests are not physical tests.
- Keep submission, checkout and public Mi cuenta disabled until the future write contract and operational gates are independently approved.

Production, public `index.html` / Mi cuenta message, current generation workflow, existing generated addresses, Residential/OWNER code, commercial catalog and migration runner remain untouched. No workflow dispatch, migration against an existing environment, generation, deployment or merge is authorized or performed.
