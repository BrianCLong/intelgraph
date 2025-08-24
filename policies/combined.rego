package intelgraph.combined

default allow = false

allow {
  data.intelgraph.authz.allow
}

allow {
  t := input.tenant
  data.tenant[t].authz.allow_extra
}

deny_reason[msg] {
  not allow
  t := input.tenant
  msg := coalesce([data.tenant[t].authz.deny_reasons[_], "policy_denied"])
}

coalesce(arr) = out {
  count(arr) > 0
  some x
  out := arr[x]
}
