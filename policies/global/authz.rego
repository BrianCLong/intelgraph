package intelgraph.authz

default allow = false

# Example: allow read investigations if role permits
allow {
  input.user.role == "analyst"
  input.operation == "Query"
  input.field == "investigations"
}

deny_reason[msg] {
  not allow
  msg := sprintf("Denied by policy: role=%s op=%s field=%s", [input.user.role, input.operation, input.field])
}
