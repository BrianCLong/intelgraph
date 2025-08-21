package intelgraph.exports

import data.intelgraph.exports

# Allow when purpose is research
allow_when_purpose_research {
  result := exports.deny with input as {"purpose": "research"}
  count(result) == 0
}

# Deny when purpose not research
block_invalid_purpose {
  result := exports.deny with input as {"purpose": "other"}
  count(result) == 1
}
