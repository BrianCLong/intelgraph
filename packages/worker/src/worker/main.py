from __future__ import annotations

from celery import Celery
import requests

app = Celery('graphai', broker='redis://redis:6379/0')


@app.task
def embed_node2vec(graph_id: str) -> None:
  requests.post(f'http://graphai:8000/embed/node2vec/{graph_id}')
