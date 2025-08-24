"""Typology detectors for structuring and circular flows."""
from dataclasses import dataclass
from typing import List, Iterable
from collections import defaultdict
import networkx as nx


@dataclass
class Transaction:
  id: str
  from_account: str
  to_account: str
  amount: float
  ts: float


@dataclass
class Alert:
  id: str
  type: str
  severity: str
  explanation: str
  evidence: List[str]


def detect_structuring(transactions: Iterable[Transaction], threshold: float, window: float, min_count: int) -> List[Alert]:
  buckets = defaultdict(list)
  for t in transactions:
    buckets[t.to_account].append(t)
  alerts: List[Alert] = []
  for acct, txns in buckets.items():
    txns = sorted(txns, key=lambda x: x.ts)
    sums = 0
    start = txns[0].ts if txns else 0
    count = 0
    evidence: List[str] = []
    for t in txns:
      if t.ts - start <= window:
        sums += t.amount
        count += 1
        evidence.append(t.id)
      else:
        sums = t.amount
        count = 1
        evidence = [t.id]
        start = t.ts
      if sums >= threshold and count >= min_count:
        alerts.append(Alert(id=f"struct-{acct}", type="STRUCTURING", severity="HIGH", explanation="many small credits", evidence=list(evidence)))
        break
  return alerts


def detect_circular(transactions: Iterable[Transaction], max_hops: int) -> List[Alert]:
  g = nx.DiGraph()
  for t in transactions:
    g.add_edge(t.from_account, t.to_account, id=t.id)
  alerts: List[Alert] = []
  for cycle in nx.simple_cycles(g):
    if 2 <= len(cycle) <= max_hops:
      ids = []
      for i in range(len(cycle)):
        a = cycle[i]
        b = cycle[(i + 1) % len(cycle)]
        ids.append(g[a][b]['id'])
      alerts.append(Alert(id=f"cycle-{'-'.join(cycle)}", type="CIRCULAR", severity="MEDIUM", explanation="circular flow", evidence=ids))
  return alerts
