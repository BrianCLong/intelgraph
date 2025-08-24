import asyncio
from collections import Counter
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

PROMPT_VERSION = "0.1"
QUERY_TIMEOUT_SECONDS = 2

app = FastAPI(title="AI Copilot", version="1.0.0")

# --- Policy Guardrails ----------------------------------------------------

def policy_check(text: str) -> None:
    lowered = text.lower()
    if "delete" in lowered:
        raise HTTPException(status_code=403, detail="Policy violation: write operations are not allowed")
    if "export" in lowered:
        raise HTTPException(status_code=403, detail="Policy violation: export is not permitted")
    if "ssn" in lowered:
        raise HTTPException(status_code=403, detail="Policy violation: PII detected")

# --- NL to Cypher ---------------------------------------------------------

ALLOWLIST = {"MATCH", "RETURN", "WHERE", "LIMIT", "COUNT", "AS"}
FORBIDDEN = {"CREATE", "DELETE", "MERGE", "SET", "DROP"}

SANDBOX_DATA = [{"name": "Alice"}, {"name": "Bob"}]


def translate_to_cypher(nl: str) -> str:
    if "count" in nl.lower():
        return "MATCH (n) RETURN count(n) AS count"
    return "MATCH (n) RETURN n LIMIT 5"


def allowlist_check(query: str) -> None:
    tokens = {t.upper() for t in query.replace("(", " ").replace(")", " ").split()}
    if FORBIDDEN & tokens:
        raise HTTPException(status_code=400, detail="Disallowed clause in query")
    unknown = {t for t in tokens if t.isalpha() and len(t) > 1} - ALLOWLIST
    if unknown:
        raise HTTPException(status_code=400, detail="Query contains unsupported clauses")


def sandbox_execute(query: str) -> List[Dict[str, Any]]:
    if "count(" in query.lower():
        return [{"count": len(SANDBOX_DATA)}]
    return SANDBOX_DATA


class QueryRequest(BaseModel):
    nl: str


class QueryResponse(BaseModel):
    nl: str
    generatedQuery: str
    results: List[Dict[str, Any]]


@app.post("/copilot/query", response_model=QueryResponse)
async def copilot_query(req: QueryRequest) -> QueryResponse:
    policy_check(req.nl)
    query = translate_to_cypher(req.nl)
    allowlist_check(query)
    try:
        results = await asyncio.wait_for(asyncio.to_thread(sandbox_execute, query), QUERY_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Query timed out") from exc
    return QueryResponse(nl=req.nl, generatedQuery=query, results=results)

# --- RAG -----------------------------------------------------------------

DOCUMENTS: List[Dict[str, Any]] = [
    {"id": "doc1", "text": "Alice works at Acme Corp.", "redacted": False},
    {"id": "doc2", "text": "Bob's SSN is 123-45-6789.", "redacted": True},
]
for i in range(3, 51):
    DOCUMENTS.append({"id": f"doc{i}", "text": f"Sample filler text {i}.", "redacted": False})


def embed(text: str) -> Counter:
    return Counter(text.lower().split())


EMBEDDINGS = [
    {"id": doc["id"], "embedding": embed(doc["text"]), "text": doc["text"], "redacted": doc["redacted"]}
    for doc in DOCUMENTS
]


def similarity(a: Counter, b: Counter) -> float:
    sa, sb = set(a.keys()), set(b.keys())
    if not (sa or sb):
        return 0.0
    return len(sa & sb) / len(sa | sb)


def retrieve(query: str) -> Dict[str, Any] | None:
    q_emb = embed(query)
    scored = []
    for emb in EMBEDDINGS:
        if emb["redacted"]:
            continue
        score = similarity(q_emb, emb["embedding"])
        if score > 0:
            scored.append((score, emb))
    if not scored:
        return None
    scored.sort(reverse=True, key=lambda x: x[0])
    top = scored[0][1]
    return {"answer": top["text"], "citation": {"id": top["id"], "snippet": top["text"]}}


class RagRequest(BaseModel):
    question: str


class Citation(BaseModel):
    id: str
    snippet: str


class RagResponse(BaseModel):
    answer: str
    citations: List[Citation]


@app.post("/copilot/rag", response_model=RagResponse)
async def copilot_rag(req: RagRequest) -> RagResponse:
    policy_check(req.question)
    result = retrieve(req.question)
    if not result:
        raise HTTPException(status_code=404, detail="No relevant information found")
    return RagResponse(answer=result["answer"], citations=[result["citation"]])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
