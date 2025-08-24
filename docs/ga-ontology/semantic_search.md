# Semantic Search

Search index stores labels, synonyms, and SKOS relations. Queries expand terms to improve recall.

```
POST /search {"versionId":1, "q":"company", "expand":true}
```

Results include score and reasons such as matching synonym or broader term.
