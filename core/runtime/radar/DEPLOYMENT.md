# Radar deployment gates

Current release candidate: PR #325, branch feature/radar-functional-2. See [master checklist #317](https://github.com/direcciones507/direcciones507/issues/317). This document does not authorize deployment.

## Migration status
The master checklist records migrations 0009–0021 applied and backup/restoration verified on 20 November 2026. These supersede the original standalone SQL instructions. Never replay the standalone SQL or repeat approved migrations. If the target environment differs, inspect its migration ledger and stop at any divergence; follow the official CORE migration procedure with explicit authorization.

## Release sequence
1. Review the exact candidate SHA, branch divergence, and relevant successful CI. Code in a draft PR is not production acceptance.
2. Verify the existing CORE authentication, account isolation, owner permissions, ADMIN replacement, community tools and commercial forms in an isolated environment. Keep anonymous participation disabled until its separate security criteria are met.
3. Complete the remaining security and performance review in #317 and #321, with controlled tests outside production. Confirm rollback using the existing gates, without removing data.
4. With separate approval, merge and deploy through the existing CORE infrastructure. Verify all existing hosts, canonical TLS, private routes, mobile and tablet behavior, and unchanged historical addresses, legal and payment flows. Do not change commercial terms.
5. Only after final acceptance and separate approval, enable public Radar indexation using the existing indexing gate. Check robots.txt, canonical sitemap and privacy headers. Notify the user to submit the independent Radar sitemap to Google Search Console and Bing Webmaster Tools.

Record evidence and close only verified checklist items. No new infrastructure, migration replay, payment changes or DNS changes are authorized by this document.
