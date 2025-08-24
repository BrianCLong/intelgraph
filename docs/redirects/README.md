---
title: Web/Docs Redirects — IntelGraph → Summit
date: 2025-08-24
owner: Web Ops
audience: SRE, Docs, SEO
---

Purpose: provide safe, cacheable 301s from legacy docs paths to Summit paths with no redirect chains.

Artifacts
- Redirect map: `docs/redirects.map` (example rules)
- Legacy paths sample: `docs/legacy-top100.txt`
- Smoke: `scripts/smoke-redirects.sh` (expects 301/308 → 200, no chains)

Netlify (preferred for docs)
- Option A (netlify.toml): place at repo root
```
[[redirects]]
  from = "/intelgraph/*"
  to   = "/summit/:splat"
  status = 301
  force  = true
```
- Option B (_redirects): create `docs/_redirects`
```
/intelgraph/* /summit/:splat 301
```

CloudFront / CDN
- Use Behaviors and a Lambda@Edge/Function to rewrite `/intelgraph/*` → `/summit/:splat` with 301.
- Set Cache-Control appropriate for 301 (short TTL during burn-in).

Nginx
```
location ^~ /intelgraph/ {
  return 301 /summit/$request_uri;
}
location = /intelgraph { return 301 /summit; }
```

GitHub Pages
- Mass 301 is limited. Options:
  - Move docs to a CDN (Netlify/Cloudflare) for redirects, or
  - Use `jekyll-redirect-from` per page (manual front matter) — not scalable.
- Recommendation: host GA docs/site on a platform with native redirect config.

Smoke at cutover
```
BASE_URL=https://docs.old.example \
NEW_OK_HOST=https://docs.new.example \
scripts/smoke-redirects.sh docs/legacy-top100.txt
```

