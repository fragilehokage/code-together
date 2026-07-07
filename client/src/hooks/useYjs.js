import { useRef, useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

/**
 * Initialises a Yjs document, awareness, and the shared project-files maps
 * for a given room.  A fresh Y.Doc is created every time the room changes so
 * state never bleeds between rooms.
 *
 * @param {string|null} currentRoom
 * @param {function} addLog  - (text, type) => void
 */
export function useYjs(currentRoom, addLog) {
  // All refs hold the *current room's* objects and are replaced on room change
  const yDocRef = useRef(null);
  const yFilesMapRef = useRef(null);
  const yFileMetadataMapRef = useRef(null);
  const awarenessRef = useRef(null);
  const bindingRef = useRef(null);
  const modelsRef = useRef({});

  const [files, setFiles] = useState([]);
  const [fileMetadata, setFileMetadata] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [dynamicStyles, setDynamicStyles] = useState('');

  useEffect(() => {
    if (!currentRoom) {
      // Room left — destroy everything so nothing leaks into the next room
      bindingRef.current?.destroy();
      bindingRef.current = null;

      awarenessRef.current?.destroy();
      awarenessRef.current = null;

      yDocRef.current?.destroy();
      yDocRef.current = null;

      yFilesMapRef.current = null;
      yFileMetadataMapRef.current = null;

      Object.values(modelsRef.current).forEach((m) => m.dispose());
      modelsRef.current = {};

      setFiles([]);
      setFileMetadata({});
      setActiveFile(null);
      setCollaborators([]);
      setDynamicStyles('');
      return;
    }

    // ── Fresh doc for this room ────────────────────────────────────────────
    const doc = new Y.Doc();
    yDocRef.current = doc;

    yFilesMapRef.current = doc.getMap('project-files');
    yFileMetadataMapRef.current = doc.getMap('project-files-metadata');

    const awareness = new Awareness(doc);
    awarenessRef.current = awareness;

    const savedName = sessionStorage.getItem('username');
    const userName = savedName || `Dev #${Math.floor(Math.random() * 1000)}`;
    const randomColors = ['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];
    const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
    awareness.setLocalStateField('user', { name: userName, color: randomColor });

    // ── File list observer ──────────────────────────────────────────────────
    const updateFilesList = () => {
      const keys = Array.from(yFilesMapRef.current.keys());
      setFiles(keys);
      setActiveFile((current) => {
        if (current && keys.includes(current)) return current;
        return keys.length > 0 ? keys[0] : null;
      });
    };
    yFilesMapRef.current.observe(updateFilesList);

    // ── Metadata observer ───────────────────────────────────────────────────
    const updateMetadataList = () => {
      const meta = {};
      yFileMetadataMapRef.current.forEach((val, key) => { meta[key] = val; });
      setFileMetadata(meta);
    };
    yFileMetadataMapRef.current.observe(updateMetadataList);

    // ── Bootstrap default file if room is empty ─────────────────────────────
    if (yFilesMapRef.current.size === 0) {
      const defaultText = new Y.Text();
      defaultText.insert(0, '// Start coding collaboratively here!\nconsole.log("Hello, World!");\n');
      yFilesMapRef.current.set('main.js', defaultText);
      yFileMetadataMapRef.current.set('main.js', {
        createdBy: 'System',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      updateFilesList();
      updateMetadataList();
    }

    // ── Awareness → CSS cursors + collaborator list ─────────────────────────
    const handleAwarenessChange = () => {
      const styles = [];
      const peers = [];

      awareness.getStates().forEach((state, clientID) => {
        if (state.user?.color && state.user?.name) {
          const { name, color } = state.user;
          styles.push(`
            .yRemoteSelection-${clientID} { background-color: ${color}40 !important; }
            .yRemoteSelectionHead-${clientID} {
              position: absolute; border-left: 2px solid ${color} !important;
              height: 100%; box-sizing: border-box;
            }
            .yRemoteSelectionHead-${clientID}::after {
              position: absolute; content: '👥 ${name}'; top: -16px; left: 0;
              font-size: 10px; font-family: system-ui, sans-serif; font-weight: 600;
              color: #ffffff; background-color: ${color};
              padding: 2px 6px; border-radius: 4px; white-space: nowrap;
              z-index: 9999 !important; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              pointer-events: none;
            }
          `);
          peers.push({ clientId: clientID, name, color });
        }
      });

      setDynamicStyles(styles.join('\n'));
      setCollaborators(peers);
    };

    awareness.on('change', handleAwarenessChange);

    return () => {
      // Cleanup: observers → binding → awareness → doc → Monaco models
      yFilesMapRef.current?.unobserve(updateFilesList);
      yFileMetadataMapRef.current?.unobserve(updateMetadataList);
      awareness.off('change', handleAwarenessChange);

      bindingRef.current?.destroy();
      bindingRef.current = null;

      awareness.destroy();
      awarenessRef.current = null;

      doc.destroy();
      yDocRef.current = null;

      Object.values(modelsRef.current).forEach((m) => m.dispose());
      modelsRef.current = {};
    };
  }, [currentRoom]);

  return {
    yDocRef,
    yFilesMapRef,
    yFileMetadataMapRef,
    awarenessRef,
    files,
    setFiles,
    fileMetadata,
    setFileMetadata,
    activeFile,
    setActiveFile,
    collaborators,
    dynamicStyles,
    bindingRef,
    modelsRef,
  };
}
