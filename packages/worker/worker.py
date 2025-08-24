from __future__ import annotations

from celery import Celery

app = Celery('worker', broker='redis://redis:6379/0')


@app.task
def run_detection():
    from finintel.src import rules, alerts
    hits = rules.run_scenarios()
    for hit in hits:
        alerts.create_alert('SCENARIO', {'acctId': hit['acctId']}, hit['score'], hit)
    return len(hits)
