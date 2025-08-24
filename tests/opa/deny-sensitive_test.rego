package test.deny_sensitive

import future.keywords.if

test_deny_sensitive if {
  i := {
    "subject": {"tenant":"default","roles":["analyst"]},
    "resource": {"tenant":"default","classification":"U"},
    "request": {"fields":{"Entity.sensitiveNotes":true}}
  }
  not data.intelgraph.authz.allow with input as i
}
