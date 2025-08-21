package intelgraph.exports

default deny = []

deny[msg] {
  input.purpose != "research"
  msg := "invalid_purpose"
}
