---
title: Rebrand Control Panel — Orchestrated T‑0 Validation
date: 2025-08-24
owner: Rebrand PMO
audience: SRE, Release, Sec, Product
---

Use the Rebrand Control Panel workflow to run all critical post‑rename and cutover checks in sequence.

Workflow: `.github/workflows/rebrand-control-panel.yml`

Inputs
- expected_repo (optional): expected repo name post‑rename (e.g., `summit` or `summit-platform`)
- expected_owner (optional): expected org/owner
- old_repo: `OWNER/REPO` before rename (e.g., `ORG/intelgraph`)
- new_repo: `OWNER/REPO` after rename (e.g., `ORG/summit`)
- private: `true|false` — HTTPS clone via token if private
- do_ssh: `true|false` — also verify SSH (requires `secrets.DEPLOY_KEY`)
- base_url: legacy docs base URL (e.g., `https://docs.intelgraph.com`)
- new_ok_host: new docs host for 200 checks (e.g., `https://docs.summit.com`)
- image_tag: image tag or commit SHA to verify dual tags
- sdk_smoke: `true|false` — run optional SDK `npm view` smoke (requires `secrets.NPM_TOKEN`)

What it runs (in order)
1) Post‑Rename GitHub Checks: prints and (optionally) verifies `${{ github.repository }}` and owner; checkout sanity.
2) Post‑Rename Redirect Smoke: API redirect, HTTPS clone (and optional SSH) verify old → new repo redirect.
3) Cutover Smoke: creates a Cutover Checklist issue, runs docs redirects smoke (top‑100), dual‑tag digest check for server/client, Helm alias lint, optional SDK smoke; posts a summary comment. Optional Slack/Teams notifications if `SLACK_WEBHOOK_URL` / `TEAMS_WEBHOOK_URL` secrets are set.

### Brand Flip Placeholder (No‑Op)
- The Control Panel includes a "Brand Flip" step that calls a no‑op workflow to explicitly remind operators to flip the brand externally.
- Inputs:
  - `target_brand`: desired value for `PRODUCT_BRAND` (e.g., `Summit` or `IntelGraph`). Default: `Summit`.
  - `brand_flip_confirm`: set to `ack` to acknowledge that CI does not change runtime config and this step only prints instructions.
- How to flip runtime brand (outside CI):
  - Helm: `--set env.PRODUCT_BRAND=<target_brand>` and upgrade
  - Kubernetes: patch Deployment env var `PRODUCT_BRAND=<target_brand>` and roll pods
  - Docker Compose: export `PRODUCT_BRAND=<target_brand>` and restart services
- Rollback: set `PRODUCT_BRAND=IntelGraph` and redeploy with the same steps.

Output & Audit
- Checklist issue URL is printed in the Cutover Smoke logs and used for the summary comment.
- Summary comment includes each job’s result and a link to the workflow run.
- Redirects smoke outputs a per‑URL status for top‑100 legacy docs paths.

Secrets required (optional)
- `NPM_TOKEN` — to run SDK smoke (`sdk_smoke: true`).
- `SLACK_WEBHOOK_URL`, `TEAMS_WEBHOOK_URL` — to send completion notifications.
- `DEPLOY_KEY` — to test SSH redirect (if `do_ssh: true`).

Notes
- API endpoints must not be 301’d — this panel only touches docs/web and GitHub redirects.
- Dual‑tag verification ensures intelgraph‑* and summit‑* tags point to the same digest for the selected tag/sha.
- All tests are non‑destructive and intended for T‑0 and post‑rename validation.
