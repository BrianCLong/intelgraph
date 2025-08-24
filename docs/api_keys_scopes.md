# API Keys & Scopes

API keys are prefixed HMAC tokens with fine‑grained scopes. Keys are stored hashed and include optional expiry. Scopes gate GraphQL operations and module access while `lastUsedAt` timestamps drive rotation reminders.
