package intelgraph.exports


# Deny export when user lacks purpose/legal basis or policy label forbids
deny[msg] {
  input.action == "export_bundle"
  not input.context.purpose
  msg := "Missing purpose for processing"
}


deny[msg] {
  input.action == "export_bundle"
  some n
  input.selection[n].policy == "classified"
  not input.context.has_clearance
  msg := sprintf("Node %v requires clearance", [input.selection[n].id])
}
