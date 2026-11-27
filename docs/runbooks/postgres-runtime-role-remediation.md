# PostgreSQL runtime role: controlled remediation

Status: proposal only; not applied to production.

Production audit 2026-11-27 confirmed that CORE connects privately but uses a superuser, with TLS off. This proposal separates a NOLOGIN runtime capability role from database administration. It is a compatibility baseline for current ad507/radar tables, not a claim of fully minimized per-table permissions.

1. Use the supported authenticated administrative console and verify a current backup plus isolated restore before changes.
2. Rehearse the role proposal against an isolated schema copy. Inventory inherited PUBLIC permissions, security-definer functions, table-level grants, all enabled runtime routes and dependencies. Refine the grants to the actual required table operations. The proposal fails closed on identified inherited CREATE/ownership/TRUNCATE/grant privileges.
3. After rehearsal and approval, create a separate login with a securely supplied password, no administrative attributes, and membership only in the reviewed runtime capability role. Do not expose credentials in logs or commits. Leave existing administrator credentials and other services untouched.
4. Validate the candidate connection, TLS certificate trust and health/readiness, authentication, address flows, Radar and existing payments in isolation. Pagadito certification DDL belongs to its isolated administrative environment, not to the CORE runtime.
5. Only after validation switch CORE's connection reference with a documented rollback to its existing reference. Re-run the security audit and authenticated smoke tests. Do not remove the old administrative account or public proxy until dependencies are verified.

No production role, credentials, connection, or backup settings are changed by merging this proposal. Do not run automatically.
