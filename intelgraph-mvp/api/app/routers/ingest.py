from fastapi import APIRouter, Depends, Request

from ..deps import get_tenant_case
from ..services.ingest import ingest_rows
from ..services.audit import audit_service

router = APIRouter()


@router.post("/ingest/csv")
def ingest_csv(payload: dict, request: Request, tc=Depends(get_tenant_case)):
    graph = request.app.state.graph
    ingest_rows(
        graph,
        payload["data"],
        payload["mapping"],
        tc["tenant_id"],
        tc["case_id"],
        tc["user"].sub,
        payload.get("provenance", {}),
        payload.get("policy", {}),
    )
    audit_service.log(
        actor=tc["user"].sub,
        action="ingest_csv",
        tenant_id=tc["tenant_id"],
        case_id=tc["case_id"],
        target_ids=[],
        policy=payload.get("policy", {}),
    )
    return {"status": "ok"}
