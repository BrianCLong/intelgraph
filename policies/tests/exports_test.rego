package intelgraph.exports


test_missing_purpose_deny {
  deny[msg] with input as {
    "action": "export_bundle",
    "context": {"purpose": ""},
    "selection": []
  }
}


test_classified_node_deny {
  deny[msg] with input as {
    "action": "export_bundle",
    "context": {"purpose": "investigation", "has_clearance": false},
    "selection": [{"id": "n1", "policy": "classified"}]
  }
}
