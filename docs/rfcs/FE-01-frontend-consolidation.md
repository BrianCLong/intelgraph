# RFC FE-01: Frontend Consolidation Strategy

**Status:** Draft  
**Author:** IntelGraph Team  
**Date:** August 19, 2025  
**Priority:** Critical Path - 7-day Sprint

## Problem Statement

IntelGraph currently has **three separate frontend directories** causing fragmentation, maintenance overhead, and developer confusion:

1. `/client/` - React app with Vite, GraphQL codegen, extensive components
2. `/apps/web/` - Newer React app with Tailwind, simpler structure  
3. `/frontend/` - Basic React app, appears incomplete

This fragmentation blocks the **golden path stabilization** and creates deployment complexity.

## Proposed Solution

**Consolidate to `/client/` as the canonical frontend** for the following reasons:

### Why `/client/` (Recommended)

✅ **Most mature codebase**
- 40+ React components including core IntelGraph features
- GraphQL codegen integration with `apollo.config.cjs`
- Playwright E2E test suite already configured
- Jest unit testing with coverage setup
- Comprehensive folder structure (`components/`, `graphql/`, `services/`, `store/`)

✅ **Production-ready features**
- Authentication with `AuthContext.jsx`
- Real-time updates via WebSocket (`useRealTimeUpdates.js`)
- Graph visualization (`GraphCanvas.tsx`, `GraphExplorer.tsx`)
- AI integration (`CopilotDrawer.tsx`, AI hooks)
- Investigation management (`InvestigationDashboard.tsx`)

✅ **Build & deployment ready**
- Vite configuration optimized
- Docker containers (dev & prod)
- CI integration with GitHub Actions
- NPM scripts for all environments

### Why NOT `/apps/web/`

❌ **Limited functionality** - Only basic App.tsx and minimal components
❌ **No GraphQL integration** - Missing Apollo Client setup
❌ **No E2E tests** - Would require full test suite migration
❌ **Missing core features** - No investigation, graph, or AI components

### Why NOT `/frontend/`

❌ **Incomplete implementation** - Missing critical IntelGraph features
❌ **No test coverage** - Would require complete testing setup
❌ **Basic structure** - Lacks production-ready architecture

## Implementation Plan

### Phase 1: Migration Audit (Day 1)
- [ ] Audit unique features in `/apps/web/` and `/frontend/`
- [ ] Identify any styling/component improvements to preserve
- [ ] Document any configuration differences

### Phase 2: Feature Migration (Days 2-3)
- [ ] Migrate any superior Tailwind styling from `/apps/web/`
- [ ] Port any unique components or utilities
- [ ] Update package.json dependencies if needed

### Phase 3: Cleanup & Archive (Day 4)
- [ ] Move `/apps/web/` and `/frontend/` to `/archive/` directory
- [ ] Update all documentation to reference `/client/`
- [ ] Update Docker, CI, and deployment scripts

### Phase 4: Golden Path Validation (Days 5-7)
- [ ] Ensure golden path works end-to-end in `/client/`
- [ ] Update E2E tests to validate complete user journey
- [ ] Verify build and deployment process

## Decision Matrix

| Criteria | `/client/` | `/apps/web/` | `/frontend/` |
|----------|------------|--------------|--------------|
| **Component maturity** | ✅ 40+ components | ❌ Basic | ❌ Minimal |
| **GraphQL integration** | ✅ Full Apollo setup | ❌ None | ❌ None |
| **Test coverage** | ✅ Jest + Playwright | ❌ Minimal | ❌ None |
| **Production features** | ✅ Auth, realtime, AI | ❌ Basic | ❌ Basic |
| **Build pipeline** | ✅ Full CI/CD | ❌ Basic | ❌ None |
| **Developer experience** | ✅ Hot reload, codegen | ✅ Vite | ❌ Basic |

## Risks & Mitigation

### Risk: Loss of newer Tailwind styling
**Mitigation:** Audit and migrate superior styling components during Phase 2

### Risk: Breaking existing development workflows  
**Mitigation:** Maintain `/client/` development commands, update documentation

### Risk: Deployment pipeline disruption
**Mitigation:** Test deployment process thoroughly in Phase 4

## Success Criteria

- [ ] Single frontend directory (`/client/`) with all features
- [ ] Golden path E2E test passes: Investigation → Entities → Relationships → Copilot → Results
- [ ] `make up && make smoke` passes consistently
- [ ] All team members can run development environment from `/client/`
- [ ] CI pipeline builds and deploys from consolidated frontend

## Timeline

**Target Completion:** August 23, 2025 (Day 4 of 7-day sprint)

- **Day 1:** Audit and decision finalization
- **Day 2-3:** Feature migration and integration
- **Day 4:** Cleanup and archive
- **Day 5-7:** Golden path validation and team validation

## Decision

**APPROVED:** Consolidate to `/client/` as the canonical IntelGraph frontend.

**Rationale:** `/client/` has the most mature codebase, production-ready features, and comprehensive test coverage. The migration effort is minimal compared to rebuilding core functionality in other directories.

**Next Steps:**
1. Begin Phase 1 audit immediately
2. Assign frontend lead to execute migration plan
3. Update team documentation and onboarding guides

---

*This RFC supports the critical 7-day sprint goal of stabilizing the golden path and achieving single frontend deployment.*