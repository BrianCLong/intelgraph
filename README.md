# IntelGraph GA-Assist

An on-prem AI copilot for IntelGraph offering natural language to action, retrieval augmented answers, safety, and evaluation tooling.

```
user -> chat -> planner -> tools -> composer -> answer
                          \-> retrieval -> citations
```

## Quickstart

```bash
npm install
python -m venv .venv && source .venv/bin/activate && pip install -r packages/assist/requirements.txt
npm run build --workspaces
docker-compose -f infra/docker-compose.yml up
```

## Safety Gates

- Deterministic planner uses allow-listed templates.
- Policy DSL enforces purpose and sensitivity.
- Composer refuses to answer without citations.

## Evaluation Loop

```text
seed cases -> run eval -> review metrics -> improve prompts/policies
```
