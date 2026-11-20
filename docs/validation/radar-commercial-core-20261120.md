# Radar commercial card and CORE administration — draft block

Continuation from `6161be9b356aae85629d0865593ad8d40eaeea4b`, whose seven successful
checks were confirmed externally by the user. No workflows were started or polled
at the beginning. No production access, deployment, backup or migration in this block.

## Implemented

- Free public commercial information now uses a dedicated safe renderer: territory,
  description, clickable business phone, labelled services/category attributes and
  HTTPS links identified by hostname. One effective schedule prevents showing old
  and updated hours simultaneously. Capacity appears once, including zero.
- The verified-business indicator comes from the server's current verified-owner
  table; a submitted profile or an activity report cannot grant it.
- Verified owners can edit public territory labels, description, phone, schedule,
  social links and category attributes from the existing CORE account panel.
  Name, category, country and map coordinates remain outside this editor.
- The server derives identity from the existing session and checks the exact
  establishment/owner relation. It validates the existing public-profile schema.
  The update locks ownership again before writing, preserves the original submitter
  and existing capacity/unit, synchronizes hours, and audits atomically. If audit
  fails, both profile and hours roll back. Revocation prevents later edits.
- ADMIN CORE can search establishment names and navigate all four lists in pages
  of 100: verification requests, authorized owners, older pending publications,
  and published establishments. The publication action applies only to older
  pending entries, not routine approval of new free registrations.
- Removed the public card's "Administrar o reclamar esta ficha" action.
- When all existing CORE ADMIN gates are enabled, Radar links authorized admins
  to CORE and omits the separate moderation dialog/manual-ID form. When closed,
  the existing protected moderation interface remains available as a fallback.
  Protected endpoints and all records are preserved. Old saved business actions
  return to the existing CORE panel when the replacement is active.
- Privacy links to the existing shared `/legal/privacy` route instead of the
  nonexistent `/legal/privacidad` path. Legal content is unchanged.

## Validation at the end of the block

Four new tests passed locally after TypeScript transpilation to Node's test runner;
CI executes the original Bun sources. Coverage includes isolated PGlite writes,
account isolation, revoked ownership, author/capacity preservation, audit-failure
rollback for profile and hours, parameterized search/pagination, safe rendering,
effective hours, server-derived verification and conditional ADMIN retirement.
Targeted TypeScript validation, JavaScript syntax and whitespace checks passed.
No previously approved test suite was rerun locally.

The new browser acceptance script exercises named requests, evidence confirmation,
pagination, search, editing and close/reopen controls with synthetic sessions and
intercepted writes. It is included in the existing Radar browser CI job. Local
execution was blocked before browser startup: Chromium's process-singleton socket
was denied by this execution environment. It was not retried and is **not approved**.
This is a runtime limitation, not evidence that browser behavior passed or failed.

## Still pending

The new commit's CI and browser acceptance need external verification. All feature
gates stay closed; no deployment or activation was performed. Validate actual CORE
sessions and the replacement before enabling conditional removal of the old ADMIN.
Keep Google/email acceptance, cross-account production verification, and remaining
checklist items open. Owner withdrawal needs the agreed retention/restoration and
active-paid-service rules before implementation; this block does not infer them or
delete records. No identity/fiscal document collection or paid Radar product enabled.
