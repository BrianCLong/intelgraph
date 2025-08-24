"""IntelGraph Data Quality Service"""

from __future__ import annotations

from typing import Dict, List

from fastapi import FastAPI, HTTPException

from models import EvaluationRequest, Finding, QuarantineItem, Rule
from rule_engine import evaluate

app = FastAPI(title="Data Quality Service", version="0.1.0")

RULES: Dict[str, Rule] = {}
QUARANTINE: List[QuarantineItem] = []


@app.post("/dq/rules", response_model=Rule)
def create_rule(rule: Rule) -> Rule:
    RULES[rule.id] = rule
    return rule


@app.get("/dq/rules", response_model=List[Rule])
def list_rules() -> List[Rule]:
    return list(RULES.values())


@app.post("/dq/rules/validate")
def validate_rule(rule: Rule) -> Dict[str, str]:
    return {"status": "valid"}


@app.delete("/dq/rules/{rule_id}")
def delete_rule(rule_id: str) -> Dict[str, str]:
    if rule_id in RULES:
        del RULES[rule_id]
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="rule not found")


@app.post("/dq/evaluate", response_model=List[Finding])
def evaluate_payload(req: EvaluationRequest) -> List[Finding]:
    findings = evaluate(req)
    if findings:
        item = QuarantineItem(id=str(len(QUARANTINE) + 1), payload=req.payload, reason="rule violation")
        item.seal(QUARANTINE[-1] if QUARANTINE else None)
        QUARANTINE.append(item)
    return findings


@app.post("/dq/quarantine/retry")
def quarantine_retry(item_id: str) -> Dict[str, str]:
    for i, item in enumerate(QUARANTINE):
        if item.id == item_id:
            QUARANTINE.pop(i)
            return {"status": "retried"}
    raise HTTPException(status_code=404, detail="item not found")


@app.post("/dq/quarantine/drop")
def quarantine_drop(item_id: str, reason: str) -> Dict[str, str]:
    for i, item in enumerate(QUARANTINE):
        if item.id == item_id:
            QUARANTINE.pop(i)
            return {"status": "dropped", "reason": reason}
    raise HTTPException(status_code=404, detail="item not found")
