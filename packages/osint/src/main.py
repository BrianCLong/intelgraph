"""Minimal OSINT service providing HTML-to-text extraction."""

from fastapi import FastAPI
from pydantic import BaseModel
from bs4 import BeautifulSoup

app = FastAPI(title="OSINT Service")


class ExtractRequest(BaseModel):
    """Request body for the text extraction endpoint."""

    html: str


class ExtractResponse(BaseModel):
    """Response model containing the extracted plain text."""

    text: str


@app.post("/extract/text", response_model=ExtractResponse)
def extract_text(request: ExtractRequest) -> ExtractResponse:
    """Extract readable text from supplied HTML."""

    soup = BeautifulSoup(request.html, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    return ExtractResponse(text=text)


@app.get("/health")
def health() -> dict[str, str]:
    """Simple health check endpoint."""

    return {"status": "ok"}
