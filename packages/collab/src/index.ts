import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import setupWSConnection from 'y-websocket/bin/utils';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
wss.on('connection', (conn, req) => {
  const params = new URLSearchParams(req.url?.split('?')[1]);
  const docName = params.get('doc') || 'default';
  setupWSConnection(conn, req, { docName });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

server.listen(4010, () => {
  console.log('collab running on 4010');
});
