# Radar: acceptance feedback, 20 November 2026

User confirmed creation/publication in production and reported four missing interactions.

This patch: after successful owner registration, direct the authenticated customer to the shared CORE account section; the Mi cuenta button targets the same section and the asynchronously loaded panel scrolls there. Ordinary citizen registration still returns to the map. Cards dismiss on outside interaction, empty map tap in both engines, Escape or existing close button; pin selection, dialogs and draft state remain intact.

Remaining work: owner-declared accounts currently see their establishment and can request voluntary verification, but cannot edit commercial information/capacity until verified. Design a scoped, audited workflow for initial capacity and later changes by the submitting account without granting verified status or editing unrelated establishments. Provide category-specific tables, rooms, places, units; distinguish capacity from real-time availability. Add a commercial photo upload flow using existing CORE media service and storage after checking authorization, MIME, size, moderation, replacement, and publication/cleanup rules. Do not reuse a paid digital-address entitlement or a public unrestricted upload. No media or permission change in this patch.

Require CI and real owner account acceptance after deployment. Do not close the broader security/performance review or enable indexing.