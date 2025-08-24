/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const url = require('url');
const { WebSocketServer } = require('ws');

const HEARTBEAT_INTERVAL = 30000;
const IDLE_TIMEOUT = 60000;

const comments = new Map();
const sessions = new Map();
const processed = new Set();

function sanitize(str = '') {
  return str.replace(/[<>]/g, '');
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (req.method === 'GET' && parsed.pathname && parsed.pathname.startsWith('/collab/history/')) {
    const entityId = parsed.pathname.split('/').pop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(comments.get(entityId) || []));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (!msg.eventId || processed.has(msg.eventId)) return;
      processed.add(msg.eventId);
      switch (msg.type) {
        case 'presence.join': {
          sessions.set(msg.sessionId, { ...msg, ws, last: Date.now() });
          broadcast({
            type: 'presence.join',
            userId: msg.userId,
            tenantId: msg.tenantId,
            sessionId: msg.sessionId,
          });
          break;
        }
        case 'presence.leave': {
          sessions.delete(msg.sessionId);
          broadcast(msg);
          break;
        }
        case 'selection.update':
        case 'comment.add':
        case 'comment.edit':
        case 'typing': {
          if (msg.type === 'comment.add') {
            const list = comments.get(msg.entityId) || [];
            list.push({ commentId: msg.commentId, userId: msg.userId, text: sanitize(msg.text) });
            comments.set(msg.entityId, list);
          }
          broadcast(msg);
          break;
        }
        case 'heartbeat': {
          const session = sessions.get(msg.sessionId);
          if (session) session.last = Date.now();
          break;
        }
        default:
          break;
      }
    } catch {
      // ignore invalid messages
    }
  });

  ws.on('close', () => {
    for (const [id, sess] of sessions.entries()) {
      if (sess.ws === ws) {
        sessions.delete(id);
        broadcast({
          type: 'presence.leave',
          sessionId: id,
          userId: sess.userId,
          tenantId: sess.tenantId,
        });
      }
    }
  });
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const sess of sessions.values()) {
    try {
      sess.ws.send(data);
    } catch {
      // ignore
    }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of sessions.entries()) {
    if (now - sess.last > IDLE_TIMEOUT) {
      sessions.delete(id);
      try {
        sess.ws.close();
      } catch {
        // ignore
      }
    }
  }
}, HEARTBEAT_INTERVAL);

server.listen(4000);
