---
title: IntelGraph → Summit Soft Rename (Level B)
date: 2025-08-24
owner: Rebrand PM (with SRE/Sec)
audience: Engineering, Product, Support
---

This document tracks the Level B soft rename plan and artifacts.

## Brand Abstraction Layer
- Config: `config/brand/brand.yaml` with `product_name: Summit`, `formerly: IntelGraph`, logos, tokens, `feature_flags.brand_summit: true`.
- Runtime flag: `PRODUCT_BRAND=Summit` (rollback: `IntelGraph`).
- Server middleware: `server/src/middleware/brandHeaders.ts` (accepts `X-IntelGraph-Tenant` and `X-Summit-Tenant`, sets `X-Brand-Name`, `X-Brand-Notice`).

## GitHub Repo Rename
- Pre-checks: confirm Actions use `${{ github.repository }}` (not hard-coded); list webhooks to re-auth.
- Rename `intelgraph` → `summit` (`summit-platform` if preferred).
- Post: update badges and remotes: `git remote set-url origin git@github.com:<ORG>/summit.git`.

## Dual-name Artifacts & Aliases
- Containers: CI pushes `summit-server` and `summit-client` tags in addition to existing intelgraph tags.
- Helm: new chart `helm/summit/Chart.yaml` with `aliases: [intelgraph]`.
- SDKs: publish `@summit/sdk` and `summit-sdk`; keep `@intelgraph/sdk` as meta-packages (separate repo/publish step).
- OPA header alias: implemented via middleware.

## Web/Docs/SEO
- Map /intelgraph/* → /summit/* (web server); update canonicals/sitemaps.
- Code samples use Summit (legacy name noted as formerly IntelGraph).

## Identity & Certificates
- Keep SAML EntityID and OAuth client_ids; add Summit display/logo.
- Dual-SAN TLS; review HSTS/CSP; SPF/DKIM/DMARC for @summit.

## Observability & Backoffice
- Keep metric keys stable; add `brand=Summit` dimension at emitters (follow-up Level C for deep rename).
- Clone dashboards/alerts with Summit names; map CRM/Billing codes.

## CI Safety & Smoke
- Brand Scan workflow: `.github/workflows/brand-scan.yml` fails on stray `IntelGraph` outside allowlist.
- Launch-day smoke: repo redirect, CI, UI branding, SDK install old+new, chart alias, webhooks, SSO, top-100 docs 301s.

## Comms & FAQ
- Status banner, in-app toast (via `X-Brand-Notice`), FAQ, T-14/T-3/T-0 emails.
- Public statement: “name only—no functional or pricing changes.”

## Runbook
- T-14→T-7: clear domains; prep BrandKit; stage docs; dual publish plan.
- T-7→T-2: dual publish images/SDKs; brand-scan green.
- T-2→T-0: freeze; rename repo; enable redirects.
- T-0: flip `PRODUCT_BRAND=Summit`; publish comms; run smoke; war-room.
- T+1→T+7: burn-in; fix stragglers; screenshot refresh.
- T+30: deprecation notices on IntelGraph aliases; publish EOL date.

## Rollback (≤72h)
- Flip `PRODUCT_BRAND=IntelGraph`; disable web 301s; keep aliases; revert banners; publish advisory.

