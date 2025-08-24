# Acceptance Criteria

1. Users can enroll a device and receive scoped assignments.
2. Notes captured offline appear in the server after reconnection.
3. Two clients on a LAN synchronize through the relay when the gateway is unavailable.
4. A conflicting update surfaces in the UI and can be resolved.
5. Captured photos are encrypted and uploaded with retry.
6. Map tiles render offline and are purged when storage limits are exceeded.
7. Remote wipe clears local storage and invalidates keys.
8. Pull/push cycles for 1k small deltas complete in under two seconds on modern hardware.
9. Test coverage across gateway, relay, sync-lib, and PWA exceeds 80%.
