import { useRef, useEffect } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { getWsUrl } from '../config';

const RECONNECT_BASE_MS = 1500;   // first retry after 1.5 s
const RECONNECT_MAX_MS  = 30000;  // cap at 30 s
const RECONNECT_FACTOR  = 2;      // exponential back-off multiplier

/**
 * Opens a WebSocket connection for a Yjs room, syncs document updates and
 * awareness signals, and honours simulated latency / packet-loss for demos.
 *
 * Fix #2:  latency now applies to ALL incoming messages (binary + JSON).
 * Fix #10: automatic exponential-back-off reconnect on unexpected close.
 * Fix #15: addLog stored in a ref so the long-lived effect closure is never stale.
 */
export function useWebSocket({ currentRoom, yDocRef, awarenessRef, addLog, networkParamsRef }) {
  const socketRef = useRef(null);

  // Fix #15: keep addLog in a ref so we never close over a stale version
  const addLogRef = useRef(addLog);
  useEffect(() => { addLogRef.current = addLog; }, [addLog]);

  useEffect(() => {
    if (!currentRoom) return;

    let destroyed = false;         // set to true when the effect is cleaned up
    let reconnectDelay = RECONNECT_BASE_MS;
    let reconnectTimer = null;

    const userName =
      sessionStorage.getItem('username') || `Dev #${Math.floor(Math.random() * 1000)}`;

    // ── Doc/awareness update handlers (defined once, reused across reconnects) ─
    let docUpdateHandler = null;
    let awarenessUpdateHandler = null;

    function attachHandlers(ws) {
      // Remove any previous handlers before attaching new ones
      if (docUpdateHandler) yDocRef.current?.off('update', docUpdateHandler);
      if (awarenessUpdateHandler) awarenessRef.current?.off('update', awarenessUpdateHandler);

      docUpdateHandler = (update, origin) => {
        if (origin !== 'remote-sync' && ws.readyState === WebSocket.OPEN) {
          ws.send(update);
          addLogRef.current(`📤 Sent document update (${update.byteLength} bytes)`, 'BINARY');
        }
      };

      awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
        if (origin !== 'remote-sync' && ws.readyState === WebSocket.OPEN) {
          const changedClients = [...added, ...updated, ...removed];
          const update = awarenessProtocol.encodeAwarenessUpdate(
            awarenessRef.current,
            changedClients
          );
          ws.send(
            JSON.stringify({
              type: 'AWARENESS_SIGNAL',
              sender: userName,
              clientId: awarenessRef.current.clientID,
              state: Array.from(update),
            })
          );
        }
      };

      yDocRef.current?.on('update', docUpdateHandler);
      awarenessRef.current?.on('update', awarenessUpdateHandler);
    }

    // ── Connect (called on first connect and every reconnect) ───────────────
    function connect() {
      if (destroyed) return;

      const ws = new WebSocket(getWsUrl(currentRoom));
      ws.binaryType = 'arraybuffer';
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectDelay = RECONNECT_BASE_MS; // reset back-off on success
        addLogRef.current(`🟢 Connected to room: ${currentRoom}`, 'CONNECT');

        if (yDocRef.current) {
          const localState = Y.encodeStateAsUpdate(yDocRef.current);
          ws.send(localState);
          addLogRef.current(`📤 Sent initial sync state (${localState.byteLength} bytes)`, 'SYNC');
        }

        attachHandlers(ws);
      };

      ws.onerror = () => addLogRef.current('❌ WebSocket error occurred', 'ERROR');

      // Fix #10: reconnect on unexpected close
      ws.onclose = (event) => {
        addLogRef.current('🔴 Disconnected from sync server', 'DISCONNECT');

        // code 1000 = normal closure (user navigated away) — don't reconnect
        if (destroyed || event.code === 1000) return;

        addLogRef.current(
          `🔄 Reconnecting in ${(reconnectDelay / 1000).toFixed(1)} s…`,
          'INFO'
        );
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * RECONNECT_FACTOR, RECONNECT_MAX_MS);
          connect();
        }, reconnectDelay);
      };

      ws.onmessage = (event) => {
        const { latency: currentLatency, packetLoss: currentLoss } = networkParamsRef.current;
        const isBinary = event.data instanceof ArrayBuffer;

        // Simulate packet loss — applied to ALL message types
        if (currentLoss > 0 && Math.random() * 100 < currentLoss) {
          addLogRef.current(
            `⚠️ Packet dropped! (${isBinary ? 'doc update' : 'awareness'})`,
            'DROP'
          );
          return;
        }

        const process = () => {
          try {
            if (isBinary) {
              const uint8 = new Uint8Array(event.data);
              addLogRef.current(
                `📥 Received document update (${uint8.byteLength} bytes)`,
                'BINARY'
              );
              Y.applyUpdate(yDocRef.current, uint8, 'remote-sync');
              return;
            }

            const data = JSON.parse(event.data);

            if (data.type === 'AWARENESS_SIGNAL' && data.state) {
              const buf = new Uint8Array(Object.values(data.state));
              awarenessProtocol.applyAwarenessUpdate(awarenessRef.current, buf, 'remote-sync');
              return;
            }

            if (data.type === 'USER_DISCONNECTED' && data.clientId) {
              addLogRef.current(`👥 User disconnected: Client #${data.clientId}`, 'LEAVE');
              awarenessProtocol.removeAwarenessStates(
                awarenessRef.current,
                [data.clientId],
                'remote-sync'
              );
            }
          } catch (e) {
            addLogRef.current(`❌ Error processing message: ${e.message}`, 'ERROR');
            console.error('❌ Error processing incoming message:', e);
          }
        };

        // Fix #2: apply simulated latency to ALL messages
        if (currentLatency > 0) {
          setTimeout(process, currentLatency);
        } else {
          process();
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);

      // Detach Yjs listeners
      if (docUpdateHandler) yDocRef.current?.off('update', docUpdateHandler);
      if (awarenessUpdateHandler) awarenessRef.current?.off('update', awarenessUpdateHandler);

      // Normal close (code 1000) so onclose doesn't schedule a reconnect
      socketRef.current?.close(1000);
      socketRef.current = null;
    };
  }, [currentRoom]);

  return { socketRef };
}
