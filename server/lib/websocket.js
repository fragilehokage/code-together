/**
 * WebSocket collaboration logic.
 * Call `setupWebSocket(wss)` once the WSS instance is created.
 *
 * Fix #3: MongoDB persistence is debounced per room (2 s idle window).
 *         Previously every binary Yjs update triggered an immediate DB write,
 *         causing hundreds of writes per second during active typing.
 */

const WebSocket = require('ws');
const Y = require('yjs');
const { Binary } = require('mongodb');
const { getCollection } = require('./db');

// In-memory store: roomName → Y.Doc
const activeRooms = new Map();

// Debounce timers: roomName → NodeJS.Timeout
const persistTimers = new Map();

// How long to wait after the last update before writing to MongoDB (ms)
const PERSIST_DEBOUNCE_MS = 2000;

/**
 * Schedule a debounced persistence write for the given room.
 * Resets the timer on every call so rapid edits coalesce into one write.
 */
function schedulePersist(roomName, doc) {
  const collection = getCollection();
  if (!collection) return;

  if (persistTimers.has(roomName)) {
    clearTimeout(persistTimers.get(roomName));
  }

  const timer = setTimeout(async () => {
    persistTimers.delete(roomName);
    try {
      const updatedState = Y.encodeStateAsUpdate(doc);
      await collection.updateOne(
        { room: roomName },
        {
          $set: {
            binaryData: new Binary(Buffer.from(updatedState)),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error(`❌ Failed to persist room [${roomName}]:`, err.message);
    }
  }, PERSIST_DEBOUNCE_MS);

  persistTimers.set(roomName, timer);
}

function setupWebSocket(wss) {
  // ── Connection handler ──────────────────────────────────────────────────
  wss.on('connection', async (ws, req) => {
    const urlParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const roomName = urlParams.searchParams.get('room') || 'default-room';

    console.log(`🔌 Engineer linked to room: [${roomName}]`);
    ws.room = roomName;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    // ── Get or create Yjs doc for this room ─────────────────────────────
    let doc;
    if (activeRooms.has(roomName)) {
      doc = activeRooms.get(roomName);
    } else {
      doc = new Y.Doc();
      activeRooms.set(roomName, doc);

      const collection = getCollection();
      if (collection) {
        try {
          const saved = await collection.findOne({ room: roomName });
          if (saved?.binaryData) {
            const buf = new Uint8Array(saved.binaryData.buffer);
            Y.applyUpdate(doc, buf);
            console.log(`🔄 Loaded historical document snapshot for [${roomName}]`);
          }
        } catch (err) {
          console.error(`⚠️  Could not load state for room [${roomName}]:`, err.message);
        }
      }
    }

    // ── Send initial sync to the newly connected client ──────────────────
    const initialSync = Y.encodeStateAsUpdate(doc);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(initialSync);
    }

    // Replay existing awareness states from other clients in the room
    wss.clients.forEach((client) => {
      if (
        client !== ws &&
        client.room === roomName &&
        client.awarenessState &&
        client.readyState === WebSocket.OPEN
      ) {
        ws.send(JSON.stringify(client.awarenessState));
      }
    });

    // ── Message handler ─────────────────────────────────────────────────
    ws.on('message', (message, isBinary) => {
      if (isBinary) {
        // Yjs binary document update
        try {
          const uint8 = new Uint8Array(message);
          Y.applyUpdate(doc, uint8);

          // Fix #3: debounce — don't hit MongoDB on every single keystroke
          schedulePersist(roomName, doc);
        } catch (err) {
          console.error(`❌ Sync error in room [${roomName}]:`, err.message);
        }
      } else {
        // JSON message (awareness signals, etc.)
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'AWARENESS_SIGNAL') {
            ws.clientId = data.clientId;
            ws.awarenessState = data;
          }
        } catch (err) {
          console.error('❌ Failed to parse JSON message:', err.message);
        }
      }

      // Broadcast to everyone else in the room
      wss.clients.forEach((client) => {
        if (client !== ws && client.room === roomName && client.readyState === WebSocket.OPEN) {
          client.send(message, { binary: isBinary });
        }
      });
    });

    // ── Disconnect handler ──────────────────────────────────────────────
    ws.on('close', () => {
      console.log(`🔌 Left room: [${roomName}]`);

      if (ws.clientId) {
        wss.clients.forEach((client) => {
          if (client !== ws && client.room === roomName && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'USER_DISCONNECTED', clientId: ws.clientId }));
          }
        });
      }

      const roomHasUsers = Array.from(wss.clients).some((c) => c.room === roomName);
      if (!roomHasUsers) {
        // Flush any pending debounced write before evicting the room
        if (persistTimers.has(roomName)) {
          clearTimeout(persistTimers.get(roomName));
          persistTimers.delete(roomName);

          // Final immediate persist so no data is lost when the last user leaves
          const collection = getCollection();
          if (collection) {
            const finalState = Y.encodeStateAsUpdate(doc);
            collection.updateOne(
              { room: roomName },
              {
                $set: {
                  binaryData: new Binary(Buffer.from(finalState)),
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            ).catch((err) => console.error(`❌ Final persist failed for [${roomName}]:`, err.message));
          }
        }

        activeRooms.delete(roomName);
        console.log(`🧹 Room [${roomName}] cleared from active server memory`);
      }
    });
  });

  // ── Heartbeat ────────────────────────────────────────────────────────────
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  return heartbeat;
}

module.exports = { setupWebSocket };
