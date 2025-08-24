from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class BlockRequest(BaseModel):
    scope: str

@app.post('/block')
async def block(req: BlockRequest):
    # placeholder blocking
    return {"candidatesCount": 0, "samplePairs": []}

class Pair(BaseModel):
    a_id: str
    b_id: str

@app.post('/match/pairs')
async def match_pairs(pairs: list[Pair]):
    scored = [{"a_id": p.a_id, "b_id": p.b_id, "score": 0.5, "calibrated": 0.5} for p in pairs]
    return {"scoredPairs": scored}

@app.get('/health')
async def health():
    return {"status": "ok"}
