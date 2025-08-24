from fastapi import APIRouter, Depends

from ..deps import get_tenant_case, require_clearance
from ..services.audit import audit_service

router = APIRouter()


@router.get("/audit/logs")
def logs(limit: int = 100, tc=Depends(get_tenant_case), user=Depends(require_clearance("analyst"))):
    return audit_service.get_logs(tc["tenant_id"], tc["case_id"], limit)
