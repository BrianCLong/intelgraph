const http = require('http');
const path = require('path');
const { PolicyAudit } = require('../../packages/policy-audit');

function createServer(opts = {}) {
  const policyDir =
    opts.policyDir || process.env.POLICY_DIR || path.join(__dirname, '../../contracts/policy');
  const auditDir = opts.auditDir || process.env.AUDIT_DIR || path.join(__dirname, '../../audit');
  const pa = new PolicyAudit({ policyDir, auditDir });
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/v0/eval') {
      collect(req, async (body) => {
        try {
          const { subject, action, resource, context } = JSON.parse(body);
          const result = await pa.evaluate({ subject, action, resource, context });
          respond(res, result);
        } catch (err) {
          res.statusCode = 400;
          respond(res, { error: err.message });
        }
      });
    } else if (req.method === 'POST' && req.url === '/v0/audit') {
      collect(req, async (body) => {
        try {
          const { decision, reason, subject, resource } = JSON.parse(body);
          const auditId = await pa.audit({ decision, reason, subject, resource });
          respond(res, { auditId });
        } catch (err) {
          res.statusCode = 400;
          respond(res, { error: err.message });
        }
      });
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
}

function collect(req, cb) {
  let data = '';
  req.on('data', (chunk) => (data += chunk));
  req.on('end', () => cb(data));
}

function respond(res, payload) {
  const json = JSON.stringify(payload);
  res.setHeader('Content-Type', 'application/json');
  res.end(json);
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port);
}

module.exports = { createServer };
