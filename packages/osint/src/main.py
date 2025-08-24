from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="OSINT Service")

# Simple in-memory shortlink map used for offline URL expansion tests.
SHORTLINKS = {
    "http://short.local/a": "http://example.com/article",
    "http://short.local/b": "http://example.com/about",
}


class URLRequest(BaseModel):
    """Incoming request payload for URL resolution."""

    raw: str


class URLResponse(BaseModel):
    """Response payload containing the expanded URL and redirect chain."""

    expanded: str
    redirects: list[str]


@app.post("/resolve/url", response_model=URLResponse)
async def resolve_url(req: URLRequest) -> URLResponse:
    """Expand a raw URL using the in-memory shortlink table."""

    current = req.raw
    redirects: list[str] = []
    while current in SHORTLINKS:
        current = SHORTLINKS[current]
        redirects.append(current)
    return URLResponse(expanded=current, redirects=redirects)
