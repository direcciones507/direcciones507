# Direcciones507 — Core API contracts

## Purpose

Define the first PostgreSQL-backed contracts for the existing `ad507-core` service before implementation. These contracts are additive and coexist with legacy Apps Script/GitHub publication paths until physical verification and cutover.

## Principles

- PostgreSQL/Core becomes the source of truth progressively, not in one destructive switch.
- Public address reads must be fast and must not synchronously call Apps Script, Google, GitHub, GA4, Search Console or Natalie.
- Residential private fields and OWNER/PIN/token material never appear in public contracts.
- Plan entitlements come from `ad507_plan_capabilities`; callers must not infer them from plan names.
- Writes require authenticated/authorized server-side contexts and produce audit events.
- Natalie consumes purpose-built tools/reporting contracts; she does not receive raw SQL or database credentials.
- All responses use stable machine-readable error codes.

## Public contract: read address

### `GET /v1/addresses/:code`

Purpose: resolve an ACTIVE public BUSINESS or PLACE directly from PostgreSQL.

Success `200`:

```json
{
  "ok": true,
  "address": {
    "code": "AD507-0001",
    "type": "BUSINESS",
    "name": "Example",
    "reference": "Near the park",
    "description": null,
    "commercialDescription": null,
    "coordinates": { "latitude": 8.0, "longitude": -80.0 },
    "phone": null,
    "hours": null,
    "plan": { "code": "BUSINESS_FREE", "name": "Negocio Gratis" },
    "capabilities": {},
    "media": [],
    "socials": []
  }
}
```

Rules:

- Normalize code to uppercase before lookup.
- Return only `status = ACTIVE`.
- Public route only returns `BUSINESS` or `PLACE`.
- Never expose `legacy_payload`, ownership rows, user IDs, audit metadata, order/payment data, Residential OWNER/PIN/tokens or internal storage credentials.
- Capability object is built from `ad507_plan_capabilities`.
- Media is ordered by `position`.
- Socials are returned only when the plan capability permits them.
- Unknown/ineligible code returns `404 ADDRESS_NOT_FOUND` without revealing whether a private/suspended record exists.

## Public contract: publication metadata

### `GET /v1/addresses/:code/publication`

Purpose: provide fast server-owned metadata for canonical/public rendering and sitemap eligibility.

Success `200`:

```json
{
  "ok": true,
  "publication": {
    "code": "AD507-0001",
    "canonicalPath": "/AD507-0001/",
    "indexable": true,
    "updatedAt": "2026-10-05T00:00:00Z"
  }
}
```

Rules:

- `indexable` requires ACTIVE + public type + `public_indexing=true`.
- Residential always resolves as non-public through this contract.
- This endpoint does not call Search Console. It only describes Direcciones507 state.

## Authenticated owner/admin contract: create draft

### `POST /v1/addresses`

Creates a DRAFT record. Initial supported types: BUSINESS and PLACE. Residential continues through its existing subsystem until its migration block is explicitly approved.

Minimum request:

```json
{
  "type": "BUSINESS",
  "name": "Example",
  "reference": "Near the park",
  "coordinates": { "latitude": 8.0, "longitude": -80.0 },
  "planCode": "BUSINESS_FREE"
}
```

Rules:

- Requires authenticated CLIENT/OPERATOR/ADMIN context as appropriate.
- Validate type, coordinates, plan and capability constraints server-side.
- Code allocation is server-owned and concurrency-safe.
- Client cannot choose arbitrary privileged plan capabilities.
- Record starts as DRAFT unless a separate authorized workflow promotes it.
- Create ownership/audit records in the same transaction where applicable.
- Idempotency key support is required before this endpoint is enabled for public/self-service form submissions.

## Authenticated owner/admin contract: update draft/address

### `PATCH /v1/addresses/:code`

Rules:

- Authorization is ownership/role based, not possession of a public URL.
- Whitelist mutable fields by address type and lifecycle state.
- Plan/status changes are separate privileged actions, not generic PATCH fields.
- Validate media/social limits from capabilities.
- Persist an audit event with actor, action and changed fields. Do not audit raw secrets.

## Privileged lifecycle contracts

### `POST /v1/addresses/:code/submit`

Moves an eligible DRAFT to PENDING_REVIEW.

### `POST /v1/admin/addresses/:code/activate`

Moves an eligible record to ACTIVE after validation. Activation must be idempotent and audited.

### `POST /v1/admin/addresses/:code/suspend`

Suspends publication without deleting the record. Must remove it from sitemap eligibility immediately from Core state.

### `POST /v1/admin/addresses/:code/archive`

Archives a record. Destructive hard-delete is not part of the initial contract.

## Legacy compatibility strategy

During migration, callers use this order:

1. Query PostgreSQL-backed Core contract.
2. If the record has been migrated, Core is authoritative and no Apps Script validation occurs.
3. If the record is not yet migrated, an explicitly bounded legacy adapter may resolve the old source.
4. Legacy fallback must emit telemetry so remaining dependencies can be measured.
5. A timeout/failure in legacy fallback must not contaminate migrated records.
6. After migration coverage and physical verification reach the approved threshold, remove the legacy fallback in a separate change.

The public page must never perform both PostgreSQL and Apps Script validation serially for a migrated record.

## Error envelope

```json
{
  "ok": false,
  "error": {
    "code": "ADDRESS_NOT_FOUND",
    "message": "Address not found"
  },
  "requestId": "..."
}
```

Initial stable codes:

- `ADDRESS_NOT_FOUND`
- `INVALID_REQUEST`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `PLAN_NOT_FOUND`
- `CAPABILITY_VIOLATION`
- `INVALID_STATE_TRANSITION`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Do not return stack traces, SQL details, tokens, credentials or private record existence in public errors.

## Security baseline

- Parameterized SQL only.
- Least-privilege database role for runtime.
- Separate migration/admin credentials from runtime credentials when operationally available.
- Server-side authentication and authorization for writes.
- Rate limiting for public and authenticated routes.
- Request IDs and structured audit/operational logs.
- CORS allowlist, not wildcard for authenticated browser endpoints.
- Secure/HttpOnly/SameSite cookies if cookie sessions are used.
- CSRF protection for state-changing cookie-authenticated requests.
- Validate payload size, text lengths, URLs, media types and coordinates.
- Never log OWNER tokens, PINs, OAuth tokens, database URLs or payment credentials.

## Performance targets

For migrated records, the hot public read path should require one bounded PostgreSQL read flow and no third-party network dependency. Cache/ETag may be added after correctness, but cache must not become the source of truth.

## Implementation order

1. PostgreSQL repository/query layer for public read.
2. `GET /v1/addresses/:code` behind a disabled/internal feature gate.
3. Publication metadata/sitemap query.
4. Draft create/update with authentication and idempotency.
5. Admin lifecycle actions.
6. Legacy fallback telemetry and progressive migration.
7. Physical verification before enabling the new read path for production traffic.
