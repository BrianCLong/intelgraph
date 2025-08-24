import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

const query = `
query Neighborhood($id: ID!) {
  node(id:$id){
    id
    neighbors(depth:3, limit:50000){ id }
  }
}`;

export default function () {
  const res = http.post(
    __ENV.GRAPHQL_URL,
    JSON.stringify({ query, variables: { id: __ENV.SEED_NODE || "seed-node" } }),
    { headers: { 'Content-Type': 'application/json', 'X-Persisted-Query': 'true' } }
  );

  check(res, {
    'status 200': (r) => r.status === 200,
    'latency < 1500ms': (r) => r.timings.duration < 1500,
  });

  sleep(1);
}

