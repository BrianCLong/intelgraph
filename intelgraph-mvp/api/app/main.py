from fastapi import FastAPI

from .graph.neo4j_client import InMemoryGraph
from .routers import audit, auth, entities, health, ingest, search

app = FastAPI()
app.state.graph = InMemoryGraph()

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(entities.router)
app.include_router(search.router)
app.include_router(audit.router)
