from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .ingest import run_job
from .models import IngestJobRequest, JobStatus, new_job_id
from .redis_stream import RedisStream

app = FastAPI()
stream = RedisStream()


@app.post("/ingest/jobs", response_model=JobStatus)
async def create_job(request: IngestJobRequest) -> JobStatus:
    job_id = new_job_id()
    return await run_job(job_id, request, stream)


@app.get("/ingest/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: str) -> JobStatus:
    data = await stream.get_job(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="job not found")
    return JobStatus.model_validate(data)
