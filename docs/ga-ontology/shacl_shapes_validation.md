# SHACL Shapes & Validation

Shapes are authored in SHACL to enforce constraints on data written to the graph. The ontology service uses **pyshacl** to execute validations. Validation reports return PASS, WARN, or FAIL for each node and are surfaced through the gateway.
