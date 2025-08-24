# Security

GA-Insight uses JWT authentication with role and attribute checks.
All database queries are parameterised and services run with strict CORS and helmet defaults.
Rate limiting and audit logs protect endpoints from abuse.
