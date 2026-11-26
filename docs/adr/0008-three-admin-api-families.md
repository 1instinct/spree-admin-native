# 8. Three admin API families, chosen by probing

- Status: Accepted · 2026-11-26 · Supersedes part of ADR 0004

## Context
Live tests against Spree 4.2.7 and 6.0.6 (`infra/spree/FINDINGS.md`) showed that Spree 4.2 and
4.3 have no Platform API for orders (it arrived in 4.4.0), that no OAuth grant on 4.2 reaches
admin data, and that Spree 6 has no `/api/v2` at all.

## Decision
`spree-sdk` has three adapters: `api-v1` (4.2–4.3, `X-Spree-Token`), `platform-v2` (4.4–5.x,
app-bound OAuth) and `admin-v3` (5.4+, JWT or secret key). The probe picks one from the
store's responses, preferring admin-v3, then platform-v2, then api-v1, and checks response bodies
so unrelated 401s are not mistaken for Spree.

## Consequences
- The domain model stays version-neutral (Spree 6 vocabulary); each adapter maps into it.
- `platform-v2` is unproven until a 4.4+ store joins the Docker matrix.
- On 4.x the best sign-in UX (QR pairing) depends on the companion gem, which moves up in priority.
