# Analyst Copilot Service

This document outlines the minimal Copilot service used for tests.

- **Retrieval:** static snippet pool representing graph and document evidence.
- **Synthesis:** if evidence exists for the question, the snippet text is returned with its manifest identifier. Otherwise the service answers `"insufficient evidence"`.
- **Guardrails:** calls require `x-tenant`, `x-user`, `x-legal-basis`, `x-reason` and persisted operation header `x-operation` set to `AskCopilot`.
- **Faithfulness gate:** responses below coverage `0.9` or faithfulness `0.85` are replaced with `insufficient evidence`.

This implementation is a lightweight reference and omits the production Fastify runtime and external data sources.
