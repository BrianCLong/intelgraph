# Architecture

This repository provides a minimal vertical slice of the **IntelGraph GA-DocsNLP** stack.  The system is split into a Node.js GraphQL gateway, a Python DocsNLP service, and optional workers and web UI.  Services communicate over HTTP and can be orchestrated locally via `docker-compose`.

```
[upload] -> [parse/ner] -> [search] -> [redact] -> [package]
```
