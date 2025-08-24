# Security Considerations

- JWT (RS256) authentication with OIDC hooks.
- Role-based and attribute-based access controls enforced in the gateway.
- Helmet, CORS, rate limiting and CSRF protections enabled by default.
- All database queries use parameterized statements; user-provided text is escaped.
