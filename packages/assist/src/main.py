"""FastAPI app exposing GA-Assist endpoints."""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from . import grammar, templates, retrieval

app = FastAPI(title="GA-Assist")

# Simple in-memory retriever with demo docs
_RETRIEVER = retrieval.Retriever(
    [
        "Alice works at Acme Corp",
        "Bob is employed by Globex",
        "Acme Corp is based in Wonderland",
    ]
)


class NLQuery(BaseModel):
    question: str


class NL2CypherResponse(BaseModel):
    template_id: str
    cypher: str
    params: dict


@app.post("/nl2cypher", response_model=NL2CypherResponse)
def nl2cypher(body: NLQuery) -> NL2CypherResponse:
    """Translate natural language to a Cypher query."""
    parsed = grammar.parse(body.question)
    cypher = templates.render(parsed["template_id"], parsed["params"])
    return NL2CypherResponse(
        template_id=parsed["template_id"],
        cypher=cypher,
        params=parsed["params"],
    )


class SearchRequest(BaseModel):
    text: str
    k: int = 5


class SearchResult(BaseModel):
    document: str
    score: float


@app.post("/retrieval/search", response_model=list[SearchResult])
def search(body: SearchRequest) -> list[SearchResult]:
    """Search demo documents using BM25."""
    results = _RETRIEVER.search(body.text, body.k)
    return [SearchResult(document=doc, score=score) for doc, score in results]


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}
