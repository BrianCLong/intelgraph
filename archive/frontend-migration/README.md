# Frontend Migration Archive

**Date:** August 19, 2025  
**Migration:** RFC FE-01 Frontend Consolidation  

## What's Here

This directory contains the archived frontend directories that were consolidated into `/client/` as part of RFC FE-01.

### `/web/` (from `/apps/web/`)
- **Pros:** Newer Tailwind styling, clean component architecture
- **Cons:** Limited GraphQL integration, missing core IntelGraph features
- **Key Components:** Modern UI library, authentication context, RBAC hooks

### `/frontend/` (from `/frontend/`)  
- **Pros:** Simple structure
- **Cons:** Incomplete implementation, missing critical features
- **Key Components:** Basic React app with minimal functionality

## Migration Notes

### Components Preserved in `/client/`
- Superior Tailwind styling was reviewed and integrated where applicable
- Authentication patterns were already present in `/client/AuthContext.jsx`
- RBAC hooks concepts were integrated into existing permissions system

### Features NOT Migrated
- Mock service worker from `/web/` (not needed with GraphQL)
- Basic Graph components from `/frontend/` (GraphCanvas in `/client/` is more advanced)
- Storybook configuration (can be re-added later if needed)

## Canonical Frontend

**All development should now focus on `/client/`** which contains:
- ✅ 40+ React components with full IntelGraph features
- ✅ GraphQL Apollo Client integration with codegen
- ✅ Playwright E2E test suite
- ✅ Investigation management, graph visualization, AI integration
- ✅ Real-time updates, authentication, RBAC enforcement
- ✅ Production-ready build pipeline

## Recovery Instructions

If any component from the archived frontends is needed:
1. Review this archive directory
2. Extract the specific component
3. Adapt it to `/client/` architecture (Apollo GraphQL, existing contexts)
4. Add to `/client/src/components/` with proper imports

---

*This migration supports the 7-day sprint goal of stabilizing the golden path with a single, production-ready frontend.*