package intelgraph.access

import future.keywords.if

test_allow_valid if {
  allow with input as {
    "user": {"tenant": "t1", "clearance": 3},
    "resource": {
      "tenant": "t1",
      "sensitivity": 2,
      "purpose_allowed": ["investigation"],
      "authorities": ["warrant-123"]
    },
    "purpose": "investigation",
    "authority": "warrant-123"
  }
}

test_deny_invalid_authority if {
  deny_reason[msg] with input as {
    "user": {"tenant": "t1", "clearance": 3},
    "resource": {
      "tenant": "t1",
      "sensitivity": 2,
      "purpose_allowed": ["investigation"],
      "authorities": ["warrant-123"]
    },
    "purpose": "investigation",
    "authority": "bad-warrant"
  }
  msg == "Policy denies: tenant/sensitivity/purpose/authority mismatch"
}
