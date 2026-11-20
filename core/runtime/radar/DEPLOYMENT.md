# Radar deployment gates

Staging first. No production activation authorized.

Apply SQL in this order on a backed-up isolated database with CORE migrations already applied:
1. schema.sql
2. core-constraints.sql
3. ownership.sql
4. abuse-constraints.sql
5. account-retention.sql

These files are not yet registered in the CORE migration ledger. Register and validate them before deployment; do not replay non-idempotent SQL against a live database.

Keep RADAR_ENABLED and RADAR_OWNERSHIP_ENABLED unset until schema validation succeeds. Verify the canonical host, TLS, Google callback and AD507_RADAR_DOMAIN_VERIFIED before enabling authentication. Commercial features remain disabled.

CI covers public queries, moderation, ownership, account limits, concurrent reports and deletion retention using disposable PostgreSQL. Staging must additionally verify the actual CORE database adapter, shared login rendering, return-to-action, public address privacy and all existing hosts. Review branch divergence from main before merge.
