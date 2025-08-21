package intelgraph.access

import future.keywords.if

default allow = false

allow if {
  input.user.tenant == input.resource.tenant
  input.user.clearance >= input.resource.sensitivity
  input.purpose in input.resource.purpose_allowed
  input.authority in input.resource.authorities
}

deny_reason[msg] if {
  not allow
  msg := "Policy denies: tenant/sensitivity/purpose/authority mismatch"
}
