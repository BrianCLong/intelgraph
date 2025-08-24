from fastapi import APIRouter, Depends, Request, HTTPException

from ..deps import get_tenant_case
from ..services.er import merge_person
from ..services.audit import audit_service

router = APIRouter()


@router.post("/entities/merge")
def merge(data: dict, request: Request, tc=Depends(get_tenant_case)):
    graph = request.app.state.graph
    primary = graph.node_by_id(data["primary_id"])
    duplicate = graph.node_by_id(data["duplicate_id"])
    if not primary or not duplicate:
        raise HTTPException(status_code=404, detail="entity not found")
    merged = merge_person(graph, primary, duplicate)
    audit_service.log(
        actor=tc["user"].sub,
        action="merge",
        tenant_id=tc["tenant_id"],
        case_id=tc["case_id"],
        target_ids=[data["primary_id"], data["duplicate_id"]],
        policy=merged.policy.dict(),
    )
    return {"id": merged.id}
