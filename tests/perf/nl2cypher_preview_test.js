import http from 'k6/http';
import { check, sleep } from 'k6';


export const options = {
  vus: 25,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500']
  }
};


export default function () {
  const payload = JSON.stringify({ prompt: 'Find co-mentions between entity A and B last 30 days' });
  const res = http.post(`${__ENV.API_BASE}/copilot/preview`, payload, { headers: { 'Content-Type': 'application/json' } });
  check(res, {
    'status 200': (r) => r.status === 200,
    'has cypher': (r) => (r.json('cypher') || '').length > 0,
    'has estimate': (r) => r.json('estimate') !== undefined,
  });
  sleep(1);
}
