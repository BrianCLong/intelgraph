package authz

default allow = false

allow {
  input.user.authenticated
  input.action in allowed_actions[input.user.role]
  input.tenant == input.user.tenant
}

allowed_actions := {
  "viewer": {"read"},
  "analyst": {"read", "query", "export"},
  "admin": {"read", "query", "export", "write"}
}

violation_reason := reason if not allow
reason = {
  "message": "Access denied by policy.",
  "tenant": input.tenant,
  "role": input.user.role,
  "action": input.action
}
