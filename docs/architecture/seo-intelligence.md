# Direcciones507 — SEO & Intelligence architecture

## Objective

Make discovery and measurement part of the platform lifecycle. Operators must not manually paste every public AD507 URL into Google tools.

## Publication lifecycle

When an eligible public address becomes ACTIVE:

1. Core validates that the address is public and indexable.
2. Core exposes a stable canonical URL.
3. The URL is included automatically in the public XML sitemap.
4. Sitemap metadata is refreshed without blocking the public page request.
5. Search Console integration monitors sitemap/indexing/search-performance data where supported by Google's APIs.
6. GA4 measures page traffic and acquisition.
7. Direcciones507 first-party analytics measures product interactions such as Maps, Waze, Uber, WhatsApp, call, share and QR events.
8. Natalie reads approved reporting views/APIs and can prepare operational/commercial reports.

Google controls final crawling and indexing. Direcciones507 must never represent sitemap submission or API calls as a guarantee of indexing.

## Privacy rules

Residential addresses are never included in the public sitemap and must remain `noindex`.

Only ACTIVE addresses with a capability allowing public indexing are eligible for sitemap/search discovery.

Draft, pending, suspended and archived records are excluded from the public sitemap. If a formerly public address becomes ineligible, it must be removed from the sitemap and rendered with the appropriate indexing policy.

## Sitemap

The sitemap is generated from PostgreSQL/Core state rather than manually maintained files. If volume requires it, use a sitemap index with partitioned sitemap files.

The public request path must not synchronously wait for Google Search Console, GA4, or another third-party analytics API.

## Search Console

Use a server-side Google integration with least privilege. The integration is for property/sitemap/search-performance and supported inspection/reporting workflows. Do not put Google credentials or refresh tokens in frontend code or GitHub.

Search Console data should be normalized into internal reporting views/cache where useful so Natalie does not need broad Google account access.

## GA4

Use GA4 for web traffic/acquisition/engagement measurement. Reporting access uses server-side credentials/tokens and the Google Analytics Data API or another approved server-side reporting mechanism.

Do not send Residential private location data, OWNER/PIN data, temporary share tokens, secrets, or unnecessary personal data to GA4.

## First-party AD507 analytics

Keep product-interaction analytics under Direcciones507 control. At minimum support events for:

- public address view
- Maps
- Waze
- Uber
- WhatsApp
- call
- share
- QR

Analytics ingestion should be asynchronous/non-blocking for the public page whenever possible.

## Natalie reporting boundary

Natalie receives read-only reporting capabilities by default. Natalie may:

- summarize platform KPIs;
- compare periods;
- report top public addresses/places;
- summarize traffic and acquisition;
- report AD507 interaction events;
- prepare per-address or portfolio reports;
- identify missing/abnormal telemetry for human review.

Natalie must not receive raw Google credentials, database credentials, OWNER/PIN secrets or unrestricted SQL access.

Any future write action involving Google configuration, publication state, plan changes or customer data requires a purpose-built Core tool, authorization and audit logging.

## Recommended internal reporting model

Core should expose normalized read-only reporting endpoints/views so Admin and Natalie consume the same definitions for metrics. This avoids two competing sources of truth.

Suggested domains:

- `platform_overview`
- `address_performance`
- `interaction_events`
- `search_performance`
- `traffic_acquisition`
- `data_quality`

## Security

- Google OAuth/service credentials remain server-side only.
- Use least-privilege scopes.
- Encrypt sensitive tokens at rest when persistent storage is required.
- Audit credential connection/disconnection and administrative configuration changes.
- Rate-limit reporting endpoints.
- Separate customer authorization from Admin/Natalie reporting authorization.
- Never log access/refresh tokens.
- Never expose database or Google credentials to generated prompts.

## Delivery phases

1. PostgreSQL public/indexability model and sitemap generation.
2. First-party analytics normalization and non-blocking ingestion.
3. GA4 measurement/reporting connection.
4. Search Console property/sitemap/search-performance connection.
5. Normalized Core reporting endpoints.
6. Natalie read-only reporting tools and Admin dashboard.

This architecture is additive and does not require disabling the current analytics or legacy publication path until the replacement has been physically verified.
