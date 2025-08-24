import http from 'http';
import { evaluate, audit } from '../../packages/policy-audit/src/index.js';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/v0/eval') {
    try {
      const body = await parseBody(req);
      const result = evaluate(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400); res.end();
    }
  } else if (req.method === 'POST' && req.url === '/v0/audit') {
    try {
      const body = await parseBody(req);
      const result = audit(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400); res.end();
    }
  } else {
    res.writeHead(404); res.end();
  }
});

const port = process.env.PORT || 8181;
server.listen(port, () => {
  console.log(`policy service listening on ${port}`);
});
