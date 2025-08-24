from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from . import claims, evidence, provenance, scoring, disclosure
from .ethics import check_request
from .schemas import (
    AttachEvidenceRequest,
    Claim,
    Corroboration,
    Evidence,
    ProvExport,
    SubmitText,
    BundleRequest,
    DisclosureBundle,
    Manifest,
)
from .nlp import extractor
from .security import api_key_auth
from .observability import metrics
from .exporters import prov_json

router = APIRouter()


@router.post("/claims/extract", response_model=list[Claim])
async def extract(submit: SubmitText, _: None = Depends(api_key_auth)):
    check_request(submit.text)
    results = []
    for text in extractor.extract_claims(submit.text, submit.lang):
        claim = claims.create_claim(text)
        provenance.add_claim(claim)
        results.append(Claim(**claim))
    return results


@router.post("/evidence/register", response_model=Evidence)
async def register_evidence(e: Evidence, _: None = Depends(api_key_auth)):
    check_request(e.title or "")
    evid = evidence.register_evidence(
        e.kind,
        url=e.url,
        title=e.title,
        license_terms=e.license_terms,
        license_owner=e.license_owner,
    )
    provenance.add_evidence(evid)
    return Evidence(**evid)


@router.post("/claims/{claim_id}/attach")
async def attach(claim_id: str, req: AttachEvidenceRequest, _: None = Depends(api_key_auth)):
    claim = claims.get_claim(claim_id)
    evid = evidence.get_evidence(req.evidence_id)
    if not claim or not evid:
        raise HTTPException(404, "not found")
    claim["evidence"].append(evid["id"])
    provenance.attach(claim_id, evid["id"])
    return {"status": "ok"}


@router.get("/claims/{claim_id}", response_model=Claim)
async def get_claim(claim_id: str, _: None = Depends(api_key_auth)):
    claim = claims.get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "not found")
    return Claim(**claim)


@router.get("/claims/{claim_id}/corroboration", response_model=Corroboration)
async def get_corroboration(claim_id: str, _: None = Depends(api_key_auth)):
    claim = claims.get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "not found")
    score, breakdown = scoring.corroborate(claim_id, claim["evidence"])
    return Corroboration(claim_id=claim_id, evidence_ids=claim["evidence"], score=score, breakdown=breakdown)


@router.get("/claims/{claim_id}/ledger", response_model=ProvExport)
async def get_ledger(claim_id: str, _: None = Depends(api_key_auth)):
    graph = provenance.subgraph_for_claim(claim_id)
    return ProvExport(**prov_json.export(graph))


@router.get("/export/prov", response_model=ProvExport)
async def export_all(_: None = Depends(api_key_auth)):
    return ProvExport(**prov_json.export(provenance._graph))


@router.get("/healthz", response_class=PlainTextResponse)
async def healthz():
    return PlainTextResponse("ok")


@router.get("/readyz", response_class=PlainTextResponse)
async def readyz():
    return PlainTextResponse("ok")


@router.get("/metrics")
async def metrics_endpoint():
    return PlainTextResponse(metrics(), media_type="text/plain")


@router.post("/bundles/build", response_model=DisclosureBundle)
async def build_bundle(req: BundleRequest, _: None = Depends(api_key_auth)):
    try:
        bundle = disclosure.build_bundle(req.claim_ids)
        return DisclosureBundle(**bundle)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/bundles/{bundle_id}/manifest", response_model=Manifest)
async def get_manifest(bundle_id: str, _: None = Depends(api_key_auth)):
    manifest = disclosure.get_manifest(bundle_id)
    if not manifest:
        raise HTTPException(404, "not found")
    return Manifest(**manifest)
