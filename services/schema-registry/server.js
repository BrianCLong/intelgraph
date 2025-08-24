const http = require('http');
const { SchemaRegistry } = require('./schemaRegistry');

const registry = new SchemaRegistry();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/schema/versions') {
      const body = await parseBody(req);
      const entry = registry.propose(body.schema, body.constraints || []);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entry));
    } else if (req.method === 'POST' && req.url === '/schema/approve') {
      const body = await parseBody(req);
      const entry = registry.approve(body.version);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entry));
    } else if (req.method === 'GET' && req.url === '/schema/current') {
      const entry = registry.getCurrent();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entry));
    } else {
      res.writeHead(404);
      res.end();
    }
  } catch (err) {
    res.writeHead(500);
    res.end(err.message);
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Schema registry on ${port}`));
}

module.exports = { server, registry };
