# Upgrade from 0.x to 1.x

1. Backup your database.
2. Run `npm run build` and `make preflight`.
3. Execute `make migrate-1_0_0`.
4. Verify signatures using `scripts/release/verify_install.sh`.
