# Radar functional block — implementation closeout

Starting point: `8353648d723943bda854575631356ab37e964519`, with all seven checks
confirmed successful externally by the user. This includes the CORE replacement's
synthetic browser acceptance after its fixture corrections. Those approved tests
were not rerun locally. No workflows were started at the beginning.

## Completed in the draft implementation

1. Removed the old Radar ADMIN dialog, manual account/establishment ID form,
   public claim/owner-management dialog and their client handlers from source.
   Closing feature gates cannot restore that UI. ADMIN links to the existing CORE
   page; protected endpoints, pending records and verification history remain.
2. Pending legacy business actions return to the CORE account panel. The existing
   "Mi cuenta" button opens that panel for an authenticated user; logout remains
   available there. Anonymous access still uses the existing signed Radar login.
3. Completed the CORE editor with capacity and unit controls previously present
   in the old owner form. Public profile, hours, optional capacity/unit and the
   audit marker are written in one statement, under the ownership lock. Omitted
   capacity preserves existing values; explicit values follow existing bounds.
4. CORE approval requires an existing verification request for the exact selected
   establishment and account. Manual evidence confirmation, authenticated ADMIN,
   audit and idempotent approval/revocation remain. Legacy protected adapters are
   retained for compatibility; no public form grants ownership.

No additional OAuth, account, session, database, administration application, schema,
payment or private evidence capture was introduced. The three platforms retain
their existing CORE infrastructure. The profile/ADMIN gates remain closed.

## New validation at the end

Three focused tests passed locally after transpilation to Node's test runner;
CI executes their Bun source:

- CORE approval rejects missing or different-account requests; exact approval,
  duplicate rejection, audited revocation and subsequent edit denial succeed.
- Capacity/unit migrate to CORE, reject invalid values, and roll back together
  with the public profile when audit insertion fails.
- Both enabled and closed-gate presentations lack the retired forms/handlers and
  retain the CORE navigation. There is no old ADMIN fallback in the new source.

Targeted TypeScript, JavaScript syntax and whitespace checks passed. The existing
synthetic CORE browser acceptance was extended with capacity/unit payload checks;
its new run is pending external CI review. Local Chromium's previously documented
startup restriction was not retried. No real identities or production writes were
used for these checks.

## Release boundary

Implementation of this functional block is complete in the draft PR. This is not
a production acceptance or deployment claim. The new commit still needs external
CI verification. Feature activation and real Google/email, owner, other-account
and ADMIN sessions remain release checks. No migration, backup, restoration,
merge, deployment or gate activation was performed in this block.

The master checklist separately tracks implementation evidence and production
acceptance. The shared-authentication implementation can be closed based on its
existing approved code/tests; real login/session acceptance remains open. Wider
SEO, territory/catalog integration, audits and withdrawal/paid-service policy are
outside this closeout and stay open with their existing requirements.
