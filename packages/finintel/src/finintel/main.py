"""FastAPI entrypoint exposing screening, typology, risk, and path endpoints."""
from fastapi import FastAPI
from . import screening, typologies, risk, paths
import networkx as nx

app = FastAPI()

watchlist = [screening.WatchlistEntry(id="wl1", name="John Doe"), screening.WatchlistEntry(id="wl2", name="Alice Smith")]

@app.post('/screen')
def run_screen(body: dict):
  subjects = [screening.Subject(**s) for s in body.get('subjects', [])]
  return screening.screen(subjects, watchlist)

@app.post('/typologies/run')
def run_typologies(body: dict):
  txs = [typologies.Transaction(**t) for t in body.get('transactions', [])]
  alerts = typologies.detect_structuring(txs, 1000, 3600, 3)
  alerts += typologies.detect_circular(txs, 4)
  return [a.__dict__ for a in alerts]

@app.post('/risk/compute')
def risk_compute(body: dict):
  g = nx.DiGraph()
  for e in body.get('edges', []):
    g.add_edge(e['from'], e['to'])
  scores = risk.compute(g, body.get('seeds', []))
  return [s.__dict__ for s in scores.values()]

@app.post('/paths/find')
def paths_find(body: dict):
  g = nx.DiGraph()
  for e in body.get('edges', []):
    g.add_edge(e['from'], e['to'])
  return [list(p) for p in paths.k_shortest_paths(g, body['source'], body['target'], body.get('k', 3))]

@app.get('/health')
def health():
  return {'status': 'ok'}
