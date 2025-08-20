from __future__ import annotations

from fastapi import FastAPI, Request, HTTPException

from .api import router

app = FastAPI(title="Graph XAI")
app.include_router(router)

MAX_BODY = 1_000_000

@app.middleware("http")
async def limit_body(request: Request, call_next):
    body = await request.body()
    if len(body) > MAX_BODY:
        raise HTTPException(status_code=413, detail="Request too large")
    request._body = body
    return await call_next(request)
