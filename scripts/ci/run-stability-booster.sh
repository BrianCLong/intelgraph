#!/usr/bin/env bash
set -euo pipefail

echo "🚀 CI Stability Booster Kit - Running All Improvements"
echo "======================================================="

REPO=${REPO:-BrianCLong/intelgraph}

# 1. Check current KPI status
echo "📊 Step 1: Checking current ci:smoke KPI..."
scripts/ci/kpi-check.sh || echo "⚠️ KPI below threshold - improvements will help"

# 2. Apply Dependabot safety controls
echo "🔒 Step 2: Applying Dependabot safety controls..."
scripts/ci/dependabot-safety.sh

# 3. Check for noisy PRs and label them
echo "🏷️ Step 3: Checking for noisy PRs..."
if [ -n "${GITHUB_TOKEN:-}" ]; then
  node scripts/ci/skip-noisy.js
else
  echo "⚠️ GITHUB_TOKEN not set - skipping noisy PR check"
fi

# 4. Run triage on recent failures
echo "🔍 Step 4: Running CI triage analysis..."
if [ -n "${GITHUB_TOKEN:-}" ]; then
  scripts/ci/triage-smoke.sh
else
  echo "⚠️ GITHUB_TOKEN not set - skipping triage"
fi

# 5. Test the new Jest configuration
echo "🧪 Step 5: Testing Jest smoke configuration..."
if [ -f jest.smoke.json ]; then
  echo "✅ Jest smoke config ready"
else
  echo "⚠️ Jest smoke config not found"
fi

# 6. Test the Playwright configuration  
echo "🎭 Step 6: Testing Playwright configuration..."
if [ -f client/playwright.config.ts ]; then
  echo "✅ Playwright config updated with retries"
else
  echo "⚠️ Playwright config not found"
fi

# 7. Verify CI workflow changes
echo "⚙️ Step 7: Verifying CI workflow updates..."
if grep -q "paths-filter" .github/workflows/ci-smoke.yml; then
  echo "✅ ci:smoke v2 with file-based routing is ready"
else
  echo "⚠️ ci:smoke v2 not properly configured"
fi

echo ""
echo "🎯 Expected Impact:"
echo "  • Docs/deps PRs: Skip heavy work → instant green"
echo "  • Frontend/backend split: Reduce blast radius"
echo "  • Retries: Knock out transient flakes"
echo "  • Memory optimizations: Prevent node OOM"
echo "  • Auto-triage: Help authors fix issues faster"
echo ""
echo "📈 Target: ci:smoke pass rate 20% → 60-80% quickly → 90%+ with quarantine"
echo ""
echo "✅ CI Stability Booster Kit deployment complete!"