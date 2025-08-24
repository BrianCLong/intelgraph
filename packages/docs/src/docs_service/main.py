"""FastAPI service providing document-processing endpoints.

This service implements stubbed endpoints for ingesting documents, parsing,
performing named-entity recognition, applying PII rules, linking, and
redaction. The implementation is intentionally lightweight and deterministic
so it can run in constrained environments and act as a starting point for
the full GA-DocsNLP pipeline.
"""

from __future__ import annotations

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Docs Service", version="0.1.0")


class DocumentRef(BaseModel):
    """Reference to an ingested document."""

    documentId: str


@app.post("/ingest", response_model=DocumentRef)
async def ingest(file: UploadFile = File(...)) -> DocumentRef:  # noqa: B008
    """Ingest a document and return a reference.

    The file content is not persisted; instead a deterministic identifier is
    generated from the filename. This keeps the service stateless for tests.
    """

    document_id = file.filename or "doc-1"
    return DocumentRef(documentId=document_id)


class ParseResponse(BaseModel):
    pages: list[int]


@app.post("/parse", response_model=ParseResponse)
async def parse(document: DocumentRef) -> ParseResponse:
    """Pretend to parse a document.

    The stub returns an empty page list, demonstrating the contract without
    requiring heavy PDF parsing libraries.
    """

    return ParseResponse(pages=[])


class EntitiesResponse(BaseModel):
    entities: list[str]


@app.post("/ner", response_model=EntitiesResponse)
async def ner(document: DocumentRef) -> EntitiesResponse:
    """Perform a mock NER pass returning no entities."""

    return EntitiesResponse(entities=[])


class PIIResponse(BaseModel):
    spansUpdated: int


@app.post("/pii", response_model=PIIResponse)
async def pii(document: DocumentRef) -> PIIResponse:
    """Apply PII masking rules and report updated spans."""

    return PIIResponse(spansUpdated=0)


class LinkResponse(BaseModel):
    links: list[str]


@app.post("/link", response_model=LinkResponse)
async def link(document: DocumentRef) -> LinkResponse:
    """Link entities to a canonical knowledge base."""

    return LinkResponse(links=[])


class ClassifyResponse(BaseModel):
    labels: list[str]
    scores: dict[str, float]


@app.post("/classify", response_model=ClassifyResponse)
async def classify(document: DocumentRef) -> ClassifyResponse:
    """Return a mock classification result."""

    return ClassifyResponse(labels=[], scores={})


class SummaryResponse(BaseModel):
    summary: str


@app.post("/summarize", response_model=SummaryResponse)
async def summarize(document: DocumentRef) -> SummaryResponse:
    """Produce a simple summary for the document."""

    return SummaryResponse(summary="")


class TranslationRequest(BaseModel):
    documentId: str
    toLang: str


class TranslationItem(BaseModel):
    text: str
    fromLang: str
    toLang: str


class TranslationResponse(BaseModel):
    translations: list[TranslationItem]


@app.post("/translate", response_model=TranslationResponse)
async def translate(req: TranslationRequest) -> TranslationResponse:
    """Translate a document to the requested language.

    This stub simply echoes the request with no translation performed.
    """

    item = TranslationItem(text="", fromLang="en", toLang=req.toLang)
    return TranslationResponse(translations=[item])


class TablesResponse(BaseModel):
    tables: list[str]


@app.post("/tables/extract", response_model=TablesResponse)
async def extract_tables(document: DocumentRef) -> TablesResponse:
    """Return an empty table list as placeholder."""

    return TablesResponse(tables=[])


class FieldsResponse(BaseModel):
    fields: list[str]


@app.post("/fields/extract", response_model=FieldsResponse)
async def extract_fields(document: DocumentRef) -> FieldsResponse:
    """Return an empty field list as placeholder."""

    return FieldsResponse(fields=[])


class RedactResponse(BaseModel):
    pdfRef: str
    manifestRef: str


@app.post("/redact", response_model=RedactResponse)
async def redact(document: DocumentRef) -> RedactResponse:
    """Return references for a redacted PDF and provenance manifest."""

    return RedactResponse(pdfRef="", manifestRef="")


class ExportResponse(BaseModel):
    manifest: dict
    files: list[str]


@app.post("/export/bundle", response_model=ExportResponse)
async def export_bundle(document: DocumentRef) -> ExportResponse:
    """Export a bundle for the document."""

    return ExportResponse(manifest={}, files=[])


@app.get("/health")
async def health() -> dict[str, str]:
    """Simple health check endpoint."""

    return {"status": "ok"}


@app.get("/metrics")
async def metrics() -> str:
    """Expose basic Prometheus style metrics."""

    return "docs_requests_total 0\n"
