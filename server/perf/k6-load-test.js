import http from 'k6/http';
import { Trend } from 'k6/metrics';

export const latency = new Trend('latency');

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:4000/health');
  latency.add(res.timings.duration);
}
