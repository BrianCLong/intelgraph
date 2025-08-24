package policy

default decision = {"allow": false, "reason": "deny-by-default"}

decision = {"allow": false, "reason": "insufficient-clearance"} if {
  order[input.subject.clearance] < order[input.resource.classification]
} else = {"allow": false, "reason": "license-mismatch"} if {
  input.subject.license != input.resource.license
} else = {"allow": false, "reason": "invalid-purpose"} if {
  input.context.purpose != "investigation"
} else = {"allow": true, "reason": "authorized"} if {
  order[input.subject.clearance] >= order[input.resource.classification]
  input.subject.license == input.resource.license
  input.context.purpose == "investigation"
}

order = {"unclassified": 0, "confidential": 1, "secret": 2, "topsecret": 3}
