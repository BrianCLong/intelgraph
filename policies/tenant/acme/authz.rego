package tenant.acme.authz

# Additional allowances or denials specific to acme
allow_extra {
  input.user.role == "viewer"
  input.field == "investigations"
}

deny_reasons[msg] {
  input.field == "exportInvestigationProvenance"
  input.user.role != "analyst"
  msg := "acme: export restricted to analysts"
}
