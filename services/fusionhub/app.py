import os
import uuid
from typing import Any, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Elite Counterforce – FusionHub", version="0.1.0")

FEATURE_POLICY_CLASS = os.getenv("FEATURE_POLICY_CLASS", "false").lower() == "true"

# Example mapping of pack_id to policy class. In a real system this would be
# loaded dynamically from a pack registry or similar source.
PACK_POLICY_CLASSES: dict[str, str] = {"pla": "restricted"}


class OrgProfile(BaseModel):
    pack_id: str
    role: str = Field(..., pattern="^(adversary|partner)$")


class ScoreRequest(BaseModel):
    text: str
    context: Optional[dict[str, Any]] = None
    source_meta: Optional[dict[str, Any]] = None
    org_profile: Optional[OrgProfile] = None


class ScoreResponse(BaseModel):
    risk_score: float
    signals: list[str]
    provenance: list[str]
    trace_id: str


def resolve_policy_class(profile: Optional[OrgProfile]) -> Optional[str]:
    if not FEATURE_POLICY_CLASS or profile is None:
        return None
    return PACK_POLICY_CLASSES.get(profile.pack_id, "open")


def check_policy(policy_class: Optional[str]) -> None:
    """Placeholder for OPA policy checks."""
    # In a real implementation this would query OPA. Here we simply accept all
    # policy classes.
    _ = policy_class


@app.post("/score", response_model=ScoreResponse)
async def score(req: ScoreRequest) -> ScoreResponse:
    policy_class = resolve_policy_class(req.org_profile)
    check_policy(policy_class)

    trace = str(uuid.uuid4())
    signals = [s for s in ["bot-like", "coordinated", "low-provenance"] if s]
    score = 0.42
    return ScoreResponse(
        risk_score=score,
        signals=signals,
        provenance=["hash:sha256:..."],
        trace_id=trace,
    )
