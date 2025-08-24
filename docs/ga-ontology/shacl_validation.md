# SHACL Validation

Data is validated against SHACL shapes using `pySHACL`.

Example:

```
POST /validate/shacl {"versionId":1,"target":"postgres","scope":{"table":"people"}}
```

Results include node and shape violations persisted for audit.
