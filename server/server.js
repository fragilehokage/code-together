/**
 * server.js — entry point
 *
 * Responsibilities:
 *   1. Load env vars
 *   2. Create Express app + HTTP server
 *   3. Mount API routes
 *   4. Set up WebSocket collaboration
 *   5. Connect to MongoDB, then start listening
 *
 * Business logic lives in:
 *   lib/config.js     — env / constants
 *   lib/db.js         — MongoDB connection
 *   lib/gemini.js     — Gemini AI client
 *   lib/websocket.js  — Yjs room & WS broadcast logic
 *   routes/health.js  — GET  /api/health
 *   routes/ai.js      — POST /api/ai/chat, /api/ai/fix
 *   routes/run.js     — POST /api/run
 */

require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');

const rateLimit = require('express-rate-limit');

const { PORT, IS_PRODUCTION, ALLOWED_ORIGINS } = require('./lib/config');
const { connectToMongoDB, closeConnection } = require('./lib/db');
const { getGeminiModel } = require('./lib/gemini');
const { setupWebSocket } = require('./lib/websocket');

const healthRouter = require('./routes/health');
const aiRouter = require('./routes/ai');
const runRouter = require('./routes/run');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// ── API routes ────────────────────────────────────────────────────────────────

// Fix #14: rate-limit code execution to 20 runs/minute per IP
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code execution requests — please wait a moment.' },
});

// Rate-limit AI endpoints to 30 requests/minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests — please wait a moment.' },
});

app.use('/api/health', healthRouter);
app.use('/api/ai', aiLimiter, aiRouter);
app.use('/api/run', runLimiter, runRouter);

// ── Serve built client in production ─────────────────────────────────────────
if (IS_PRODUCTION) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/ws).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
setupWebSocket(wss);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  wss.clients.forEach((client) => client.close());
  wss.close();
  server.close(async () => {
    await closeConnection();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  await connectToMongoDB();

  server.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`🔌  WebSocket path: ws://localhost:${PORT}/ws`);
    console.log(`🤖  AI endpoint: http://localhost:${PORT}/api/ai/chat`);
    console.log(`▶️   Run endpoint: http://localhost:${PORT}/api/run`);
    console.log(`🌍  Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
    if (IS_PRODUCTION) console.log('📦  Serving client build from client/dist');
    console.log(getGeminiModel() ? '✨  Gemini AI: ACTIVE' : '⚠️   Gemini AI: DISABLED');
  });
}

start().catch((err) => {
  console.error('❌  Failed to start server:', err.message);
  process.exit(1);
});
