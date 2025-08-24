from __future__ import annotations

import json
from functools import lru_cache
from typing import List

from fastapi import APIRouter, Depends

from .audit import log_audit
from .config import get_settings
from .ethics import check_request
from .observability import track
from .schemas import (
    ExplainRequest,
    ExplainResponse,
    Importance,
    PathExplanation,
    PathResponse,
    CounterfactualResponse,
    FairnessReport,
    RobustnessReport,
)
from .security import check_api_key, require_role, enforce_limits
from .utils.graph_io import to_networkx
from .explain import saliency, paths as path_mod, counterfactuals, robustness, fairness, viz_payload

router = APIRouter(prefix="/xai")


def _req_key(req: ExplainRequest) -> str:
    return json.dumps(req.model_dump(), sort_keys=True)


@lru_cache(maxsize=128)
def _compute(req_json: str, fairness_enabled: bool, robustness_samples: int, random_seed: int) -> dict:
    _ = fairness_enabled, robustness_samples, random_seed
    req = ExplainRequest.model_validate_json(req_json)
    output = req.outputs[0]
    g = to_networkx(req.subgraph)
    edge_imp = saliency.edge_importance(g, output)
    node_imp = saliency.node_importance(g, output)
    src = output.target.get("src", "")
    dst = output.target.get("dst", "")
    path_list = [PathExplanation(**p) for p in path_mod.top_paths(g, src, dst)]
    cf_list = counterfactuals.find_counterfactual(g, output)
    robust = robustness.assess(g, output)
    fair = fairness.check(g, output)
    viz = viz_payload.build_viz(g, node_imp, edge_imp)
    importances: List[Importance] = [
        *[Importance(id=k, type="node", score=v) for k, v in node_imp.items()],
        *[Importance(id=k, type="edge", score=v) for k, v in edge_imp.items()],
    ]
    return {
        "importances": importances,
        "paths": path_list,
        "counterfactuals": cf_list,
        "robustness": robust,
        "fairness": fair,
        "viz": viz,
    }


@router.get("/healthz")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/readyz")
async def ready() -> dict:
    return {"status": "ready"}


@router.get("/metrics")
async def metrics():  # pragma: no cover
    from prometheus_client import generate_latest

    return generate_latest()


@router.post("/explain", response_model=ExplainResponse)
async def explain(
    req: ExplainRequest,
    _: None = Depends(check_api_key),
    __: None = Depends(require_role("analyst")),
) -> ExplainResponse:
    enforce_limits(req)
    check_request(json.dumps(req.options or {}))
    settings = get_settings()
    req_json = _req_key(req)
    async with track("explain"):
        data = _compute(
            req_json,
            settings.fairness_enabled,
            settings.robustness_samples,
            settings.random_seed,
        )
    audit_id = log_audit("explain", req.model_dump(), "ok")
    return ExplainResponse(**data, audit_id=audit_id)


@router.post("/explain/path", response_model=PathResponse)
async def explain_path(
    req: ExplainRequest,
    _: None = Depends(check_api_key),
    __: None = Depends(require_role("analyst")),
) -> PathResponse:
    enforce_limits(req)
    check_request(json.dumps(req.options or {}))
    settings = get_settings()
    req_json = _req_key(req)
    async with track("explain_path"):
        data = _compute(
            req_json,
            settings.fairness_enabled,
            settings.robustness_samples,
            settings.random_seed,
        )
    audit_id = log_audit("explain_path", req.model_dump(), "ok")
    return PathResponse(paths=data["paths"], audit_id=audit_id)


@router.post("/explain/counterfactual", response_model=CounterfactualResponse)
async def explain_counterfactual(
    req: ExplainRequest,
    _: None = Depends(check_api_key),
    __: None = Depends(require_role("analyst")),
) -> CounterfactualResponse:
    enforce_limits(req)
    check_request(json.dumps(req.options or {}))
    settings = get_settings()
    req_json = _req_key(req)
    async with track("explain_counterfactual"):
        data = _compute(
            req_json,
            settings.fairness_enabled,
            settings.robustness_samples,
            settings.random_seed,
        )
    audit_id = log_audit("explain_counterfactual", req.model_dump(), "ok")
    return CounterfactualResponse(counterfactuals=data["counterfactuals"], audit_id=audit_id)


@router.post("/report/fairness", response_model=FairnessReport)
async def report_fairness(
    req: ExplainRequest,
    _: None = Depends(check_api_key),
    __: None = Depends(require_role("analyst")),
) -> FairnessReport:
    enforce_limits(req)
    check_request(json.dumps(req.options or {}))
    settings = get_settings()
    req_json = _req_key(req)
    async with track("report_fairness"):
        data = _compute(
            req_json,
            settings.fairness_enabled,
            settings.robustness_samples,
            settings.random_seed,
        )
    audit_id = log_audit("report_fairness", req.model_dump(), "ok")
    return FairnessReport(fairness=data["fairness"], audit_id=audit_id)


@router.post("/report/robustness", response_model=RobustnessReport)
async def report_robustness(
    req: ExplainRequest,
    _: None = Depends(check_api_key),
    __: None = Depends(require_role("analyst")),
) -> RobustnessReport:
    enforce_limits(req)
    check_request(json.dumps(req.options or {}))
    settings = get_settings()
    req_json = _req_key(req)
    async with track("report_robustness"):
        data = _compute(
            req_json,
            settings.fairness_enabled,
            settings.robustness_samples,
            settings.random_seed,
        )
    audit_id = log_audit("report_robustness", req.model_dump(), "ok")
    return RobustnessReport(robustness=data["robustness"], audit_id=audit_id)
