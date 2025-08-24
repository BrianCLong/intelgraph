---
name: Summit Cutover Checklist
about: Run-of-Show checklist for IntelGraph → Summit rebrand (Level B)
title: "Summit Cutover Checklist — <date>"
labels: [rebrand, cutover]
assignees: []
---

## Pre-rename (T‑2 → T‑0)
- [ ] Confirm branch protection patterns and required checks are intact
- [ ] Inventory webhooks/integrations to re-auth after rename
- [ ] Verify Actions use `${{ github.repository }}` (no hard-coded repo URLs)
- [ ] Dual-publish containers/SDKs (aliases live)

## Rename & Redirects (T‑0)
- [ ] Rename repo (intelgraph → summit)
- [ ] Run Post-Rename GitHub Checks workflow
- [ ] Run Post-Rename Redirect Smoke (API/HTTPS/SSH)
- [ ] Enable docs redirects (Netlify/redirects.map)
- [ ] Run Redirects Smoke (top‑100)

## Brand Flip (T‑0)
- [ ] Set `PRODUCT_BRAND=Summit` (Rollback: IntelGraph)
- [ ] Purge CDN / cache
- [ ] UI toast/banner shows “IntelGraph is now Summit.”

## Aliases & Installs
- [ ] Verify dual-tag images (intelgraph-* and summit-*) share digest for target tag
- [ ] Helm install via `helm/summit` and alias `intelgraph` succeeds
- [ ] SDK install: `@summit/sdk` and meta `@intelgraph/sdk` resolves (warn only)

## Identity & SSO
- [ ] SAML/OAuth display name/logo updated; EntityID/client_id unchanged
- [ ] SSO smoke passes — no re-consent required

## Observability & Backoffice
- [ ] Metrics stable; dashboards cloned under Summit names
- [ ] Alerts healthy; brand=Summit dimension visible

## Comms
- [ ] Status banner live; in‑app toast live
- [ ] T‑0 customer announcement published
- [ ] FAQ updated and live

## Acceptance
- [ ] Availability ≥ 99.9% / 24h; error rate unchanged
- [ ] Top‑100 docs 301→200; no chains > 1
- [ ] Exports show “Summit (formerly IntelGraph)” and verify

## Rollback (≤72h)
- [ ] Flip `PRODUCT_BRAND=IntelGraph`; disable 301s (keep aliases)
- [ ] Restore prior HSTS; revert banners; publish advisory; open RCA

