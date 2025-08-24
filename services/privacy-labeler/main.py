import random
import re

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    import torch

    torch.manual_seed(42)
except Exception:  # pragma: no cover - torch optional
    torch = None

app = FastAPI(title="Privacy Labeler", version="0.1.0")

random.seed(42)
MODEL_VERSION = "0.1.0"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b\d{3}-\d{3}-\d{4}\b")


class ScanRequest(BaseModel):
    text: str


class ApplyRequest(BaseModel):
    text: str
    proposals: list
    authority: str | None = None
    reason: str | None = None


@app.post("/privacy/scan")
def scan(req: ScanRequest):
    matches = []
    text = req.text
    for m in EMAIL_RE.finditer(text):
        matches.append(
            {
                "label": "EMAIL",
                "confidence": 1.0,
                "span": [m.start(), m.end()],
                "explainability": {"pattern": "EMAIL_RE"},
            }
        )
    for m in PHONE_RE.finditer(text):
        matches.append(
            {
                "label": "PHONE",
                "confidence": 1.0,
                "span": [m.start(), m.end()],
                "explainability": {"pattern": "PHONE_RE"},
            }
        )
    return {"labels": matches, "model_version": MODEL_VERSION}


@app.post("/privacy/redact-proposals")
def redact_proposals(req: ScanRequest):
    scan_result = scan(req)
    suggestions = []
    for lbl in scan_result["labels"]:
        start, end = lbl["span"]
        suggestions.append({"span": [start, end], "replacement": "[REDACTED]"})
    return {"proposals": suggestions}


@app.post("/privacy/apply")
def apply(req: ApplyRequest):
    if not req.authority or not req.reason:
        raise HTTPException(status_code=400, detail="authority and reason required")
    text = list(req.text)
    for prop in req.proposals:
        start, end = prop["span"]
        repl = prop.get("replacement", "[REDACTED]")
        text[start:end] = list(repl)
    return {"redacted": "".join(text)}
