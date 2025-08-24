# Releases & Migrations

Publishing a release freezes a version and produces a signed manifest. Migration plans compare parent and child versions to suggest semver bumps and data fixes.

```
POST /release/publish {"ontologyId":1, "versionId":2, "notes":"v1.0.0"}
```
