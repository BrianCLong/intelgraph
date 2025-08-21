import random
import time
from prometheus_client import Counter, Gauge, start_http_server

# Synthetic metrics
ingest_rate = Counter('ingest_rate_total', 'Synthetic ingest rate')
er_latency = Gauge('er_latency_ms', 'Entity resolution latency in ms')
policy_eval = Gauge('policy_eval_ms', 'Policy evaluation time in ms')

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        ingest_rate.inc(random.randint(1, 5))
        er_latency.set(random.uniform(10, 200))
        policy_eval.set(random.uniform(1, 100))
        time.sleep(5)
