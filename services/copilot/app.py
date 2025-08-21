from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

from .rag import RagEngine
from .translation import Translator

app = FastAPI(title="Copilot Service")
translator = Translator()
rag_engine = RagEngine()
_docs = Path(__file__).parent / "docs"
if _docs.exists():
    rag_engine.load_directory(_docs)


class TranslateRequest(BaseModel):
    inputText: str
    allowWrites: bool | None = False


class RagRequest(BaseModel):
    question: str


@app.post("/copilot/translate")
async def translate(req: TranslateRequest) -> dict[str, object]:
    return await translator.translate(req.inputText, bool(req.allowWrites))


@app.post("/copilot/rag")
async def rag(req: RagRequest) -> dict[str, object]:
    return {"citations": rag_engine.search(req.question)}
