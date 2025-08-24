import sys, pathlib
from datetime import datetime
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))

import ingest
import rules


def setup_module(module):
    ingest.DB["transactions"].clear()
    rules.SCENARIOS.clear()


def test_structuring_detection():
    ingest.DB["transactions"].extend([
        {"srcAcctId": "A1", "channel": "CASH", "amount": 9000, "ts": datetime(2024, 1, 1, 0, 0)},
        {"srcAcctId": "A1", "channel": "CASH", "amount": 9000, "ts": datetime(2024, 1, 1, 0, 1)},
    ])
    rules.upsert_scenario({
        "key": "STRUCT",
        "name": "Structuring",
        "rule": {"value": 10000},
        "params": {"count": 2, "windowHours": 1},
        "severity": "HIGH",
        "enabled": True,
    })
    hits = rules.run_scenarios()
    assert any(h["acctId"] == "A1" for h in hits)
