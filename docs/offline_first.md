# Offline First Strategy

GA-Field is designed for intermittent connectivity. All critical workflows must function without a network connection.

## Storage
- Notes, forms, and tracks are stored in IndexedDB via Dexie.
- Media blobs are encrypted using libsodium and kept locally until uploaded.

## Synchronization
A background sync queue pushes pending deltas whenever connectivity resumes. The service worker schedules retries with exponential backoff.

## Maps
MapLibre GL renders local tile packs. Tiles are cached for offline use and expired according to storage quotas.
