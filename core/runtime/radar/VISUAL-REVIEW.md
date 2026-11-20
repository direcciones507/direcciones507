# Radar visual review

Branch: `feature/radar-en-vivo`; no production activation, migrations or main merge.

## Implementation

- Responsive navy/silver presentation, CSS 3D radar, motion graphics, GSAP 3.15.1 / ScrollTrigger parallax and progressive story cards. No scroll hijacking or external images/fonts.
- Optional Three.js 0.180.0 scene is lazy, desktop/capability gated, throttled, paused offscreen and disposed when map exploration starts. CSS remains the visual fallback.
- MapLibre GL JS 6.19.0, local assets, clustered GeoJSON, shaded activity pins, server-filtered bounds/country/name, client category/activity filters, synchronized list and detail.
- On-demand Leaflet 1.9.4 fallback preserves interactive raster map, clustering, pins and coordinate selection without WebGL. Neither renderer changes the Radar engine.
- Registration, report, moderation and ownership forms call existing endpoints. Commercial badges depend exclusively on server-returned pin values. Ownership wording only describes a report whose server source is `verified_owner`; no invented permanent verification flag.
- Account entry reuses actual `commercialEntryHtml` and its LATAM dialog in a same-origin frame. Google opens top-level; a bounded sessionStorage action restores registration/report intent after callback. Credentials remain inside the existing card. Login, registration, verification and recovery are unchanged.
- API writes retain existing session/Origin checks. Presentation is canonical-host and RADAR_ENABLED gated. Other domains are untouched. Asset allowlist, CSP, noindex, local dependencies, safe textContent and allowlisted address links.

## Map provider and costs

MapLibre itself needs no paid map API. Default browser raster tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, visible attribution and normal browser caching, HTTPS, valid Referer, no bulk/offline downloads. `RADAR_TILE_URL` supports another HTTPS XYZ provider without rewriting the UI; its attribution must also be reviewed if changing providers. OSM public tiles have no service-level guarantee and can block excessive use; choose a provider/capacity policy before a large public launch. No paid provider was activated.

References: https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/ and https://operations.osmfoundation.org/policies/tiles/ . Distributed dependency license notices are under `ui/vendor/`.

## Review preview

`node core/runtime/radar/scripts/preview.mjs` serves only an isolated read-only visual preview. Six clearly labeled fictional establishments around Panama City are fixtures. No live accounts, database, payments, write endpoints or session cookies are available. Never import this script into production. Production uses `presentation.ts` and existing Radar APIs.

## Verification and remaining release checks

- Radar tests cover presentation host/gate isolation, static asset boundaries, actual shared account rendering, public links, activity expiry and bounds, in addition to existing domain/API/security tests.
- Browser regression in the existing account workflow covers 1440×1000, 820×1180, 390×844 and 320×740, search, category/activity/country, detail, preview authentication boundary, horizontal overflow and reduced motion. Screenshots and JSON evidence are uploaded as `radar-visual-review`.
- Cloud browser has WebGL disabled. The interactive 2D fallback was reviewed there; GPU MapLibre/Three visual quality must be reviewed on a real WebGL device. Browser viewport checks do not establish real Android/iPad hardware performance.
- Live shared Google/email sessions, verification/recovery emails, actual database writes, administrator actions, GPS permissions and commercial activation require the isolated staging environment and existing accounts. No such live verification is claimed by the visual fixtures.
- Territorial selectors use country and named city map bounds. The public API does not expose province/district fields, so exhaustive administrative subdivisions are not fabricated.
- Existing deployment gates in DEPLOYMENT.md remain applicable. Production activation is not authorized by this change.


## Revision requested 19 November 2026

- Navy, brushed silver and sage identity; local, subsetted Manrope and Inter variable fonts with OFL licenses; existing MapLibre, Leaflet, GSAP and optional Three.js retained.
- Silver primary actions with touch depth. Informational/promotional lower containers removed; explanation is in an accessible native dialog, outside-click/close-button dismissal, no camera or search reset.
- Priority sidebar contains only approved, currently active featured/live campaigns matching bounds and filters. Category tracks contain only active featured records and hide when empty. No production/demo seeding.
- Normal pins reveal at baseline zoom + 0.6 and disappear on zoom-out; existing clustering remains at wide scale. No six-pin cap. Independent campaign deadlines expire locally, pause animation offscreen/hidden, and restore featured/normal status without waiting for a new API response. Availability reports do not activate live campaigns.
- Business administration uses the existing CORE identity, Origin checks and verified-owner table. Claim requests require explicit ADMIN verification through the existing endpoint. Owner-only hours and availability updates are stored separately from reports/campaigns and recheck ownership during every write. Revocation removes owner data from the public read and blocks further changes.
- Staging-only prerequisite: apply `business-details.sql` after `ownership.sql`, then enable `RADAR_BUSINESS_DETAILS_ENABLED=true` alongside the existing ownership flag. The web process applies no migrations. No production configuration or data changed for this review.
- Private visual review contains a genuinely interactive map with empty business data, so it cannot imply commercial eligibility or invent real-world availability. Synthetic records exist only behind `RADAR_TEST_FIXTURES=1` for automated regression; authentication and writes remain disabled there.
