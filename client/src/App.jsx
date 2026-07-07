import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

import { getRunLanguage } from './config';
import { checkHealth, runCode as runCodeOnServer } from './api';
import { getLanguageFromExtension } from './utils/fileUtils';

import { useYjs } from './hooks/useYjs';
import { useWebSocket } from './hooks/useWebSocket';
import { useEditorSettings } from './hooks/useEditorSettings';

import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import TelemetrySidebar from './components/TelemetrySidebar';
import AiPanel from './components/AiPanel';

import './App.css';

// ── SPA routing helper ────────────────────────────────────────────────────────
function getRoomFromPath() {
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('room');
  return idx !== -1 && parts[idx + 1] ? parts[idx + 1] : null;
}

export default function App() {
  // ── Telemetry log ─────────────────────────────────────────────────────────
  const [logs, setLogs] = useState([]);
  const addLog = (text, type = 'INFO') => {
    setLogs((prev) =>
      [{ text, timestamp: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 15)
    );
  };

  // ── Network chaos params ──────────────────────────────────────────────────
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const networkParamsRef = useRef({ latency: 0, packetLoss: 0 });
  useEffect(() => { networkParamsRef.current = { latency, packetLoss }; }, [latency, packetLoss]);

  // ── SPA routing ───────────────────────────────────────────────────────────
  const [currentRoom, setCurrentRoom] = useState(getRoomFromPath());
  const isDashboard = !currentRoom;

  // Dashboard form state
  const [roomInput, setRoomInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  // ── Yjs (files, awareness, collaborators) ────────────────────────────────
  const {
    yDocRef,
    yFilesMapRef,
    yFileMetadataMapRef,
    awarenessRef,
    files,
    fileMetadata,
    activeFile,
    setActiveFile,
    collaborators,
    dynamicStyles,
    bindingRef,
    modelsRef,
  } = useYjs(currentRoom, addLog);

  // ── WebSocket sync ────────────────────────────────────────────────────────
  const { socketRef } = useWebSocket({
    currentRoom,
    yDocRef,
    awarenessRef,
    addLog,
    networkParamsRef,
  });

  // ── Editor refs & ready flag ──────────────────────────────────────────────
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  // ── Editor preferences ────────────────────────────────────────────────────
  const {
    fontSize, setFontSize,
    lineWrap, setLineWrap,
    minimap, setMinimap,
    theme, setTheme,
  } = useEditorSettings(editorRef, editorReady);

  // ── Language for the active file ──────────────────────────────────────────
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  // ── UI panel state ────────────────────────────────────────────────────────
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // ── Code runner state ─────────────────────────────────────────────────────
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState(''); // Fix #5: stdin for interactive programs

  // ── Server health / AI availability ──────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then((data) => setAiAvailable(!!data.ai))
      .catch(() => setAiAvailable(false));
  }, []);

  // ── Handle browser back/forward ───────────────────────────────────────────
  useEffect(() => {
    const onPop = () => setCurrentRoom(getRoomFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Bind Monaco editor to the active Yjs text ────────────────────────────
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !yFilesMapRef.current || !activeFile) return;

    bindingRef.current?.destroy();

    let model = modelsRef.current[activeFile];
    if (!model) {
      const language = getLanguageFromExtension(activeFile);
      const uri = monacoRef.current.Uri.parse(`inmemory://model/${activeFile}`);
      const yText = yFilesMapRef.current.get(activeFile);
      const initialContent = yText ? yText.toString() : '';
      model = monacoRef.current.editor.createModel(initialContent, language, uri);
      modelsRef.current[activeFile] = model;
    }

    editorRef.current.setModel(model);

    const yText = yFilesMapRef.current.get(activeFile);
    if (yText && awarenessRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editorRef.current]),
        awarenessRef.current
      );
    }

    setSelectedLanguage(model.getLanguageId());
  }, [activeFile, editorReady]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);
  };

  const handleJoinRoomSubmit = (e) => {
    e.preventDefault();
    const finalRoom = roomInput.trim() || 'default-room';
    const finalUser = usernameInput.trim() || `Dev #${Math.floor(Math.random() * 1000)}`;
    sessionStorage.setItem('username', finalUser);
    window.history.pushState(null, '', `/room/${finalRoom}`);
    setCurrentRoom(finalRoom);
  };

  const handleLeaveRoom = () => {
    window.history.pushState(null, '', '/');
    setCurrentRoom(null);
    setEditorReady(false);
    editorRef.current = null;
    monacoRef.current = null;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleLanguageChange = (lang) => {
    if (editorRef.current && monacoRef.current && activeFile) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, lang);
        setSelectedLanguage(lang);
      }
    }
  };

  const getEditorCode = () => editorRef.current?.getValue() || '';

  const applyAiFix = (fixedCode) => {
    if (!activeFile || !yFilesMapRef.current) return;
    const yText = yFilesMapRef.current.get(activeFile);
    if (yText) {
      yText.delete(0, yText.length);
      yText.insert(0, fixedCode);
    }
  };

  // ── Code runner ───────────────────────────────────────────────────────────
  const runCode = async () => {
    if (!activeFile || !editorRef.current) return;
    setIsTerminalOpen(true);
    setIsRunning(true);

    const startTs = new Date().toLocaleTimeString();
    const code = editorRef.current.getValue();
    const language = getRunLanguage(activeFile, selectedLanguage);
    const ext = activeFile.split('.').pop().toLowerCase();
    const t0 = performance.now();
    const endTs = () => new Date().toLocaleTimeString();

    setTerminalLogs([
      { text: `$ run ${activeFile} (${language})`, type: 'cmd', ts: startTs },
      { text: '  Executing via server (Piston runtime)...', type: 'info', ts: '' },
    ]);

    // Static-analysis shortcuts
    if (ext === 'html') {
      setTerminalLogs((prev) => [...prev,
        { text: '🌐 HTML preview is not executed server-side.', type: 'info' },
        { text: '  Open the file in a browser tab to preview.', type: 'stdout' },
        { text: '', type: 'divider' },
        { text: '✔ Done', type: 'success' },
        { text: `  ${(performance.now() - t0).toFixed(2)} ms`, type: 'meta', ts: endTs() },
      ]);
      setIsRunning(false);
      return;
    }

    if (ext === 'css') {
      setTerminalLogs((prev) => [...prev,
        { text: '🎨 CSS has no runtime output.', type: 'info' },
        { text: '', type: 'divider' },
        { text: '✔ Done', type: 'success' },
        { text: `  ${(performance.now() - t0).toFixed(2)} ms`, type: 'meta', ts: endTs() },
      ]);
      setIsRunning(false);
      return;
    }

    if (ext === 'json') {
      try {
        JSON.parse(code);
        setTerminalLogs((prev) => [...prev,
          { text: '✓ Valid JSON — no syntax errors.', type: 'stdout' },
          { text: '', type: 'divider' },
          { text: '✔ Exited with code 0', type: 'success' },
          { text: `  ${(performance.now() - t0).toFixed(2)} ms`, type: 'meta', ts: endTs() },
        ]);
      } catch (err) {
        setTerminalLogs((prev) => [...prev,
          { text: `✖ ${err.message}`, type: 'error' },
          { text: '', type: 'divider' },
          { text: '✘ Exited with code 1', type: 'errExit' },
          { text: `  ${(performance.now() - t0).toFixed(2)} ms`, type: 'meta', ts: endTs() },
        ]);
      }
      setIsRunning(false);
      return;
    }

    // Remote execution via Piston
    try {
    const result = await runCodeOnServer({ code, language, stdin });
      const elapsed = (performance.now() - t0).toFixed(2);
      const output = [];

      if (result.compile_output) output.push({ text: result.compile_output, type: 'info' });
      if (result.stdout) result.stdout.split('\n').filter(Boolean).forEach((l) => output.push({ text: l, type: 'stdout' }));
      if (result.stderr) result.stderr.split('\n').filter(Boolean).forEach((l) => output.push({ text: l, type: 'error' }));
      if (output.length === 0) output.push({ text: '(Program ran with no output)', type: 'info' });

      const success = result.exit_code === 0;
      const footer = success
        ? [{ text: '', type: 'divider' }, { text: `✔ Exited with code ${result.exit_code}`, type: 'success' }, { text: `  ${elapsed} ms · ${result.language} ${result.version}`, type: 'meta', ts: endTs() }]
        : [{ text: '', type: 'divider' }, { text: `✘ Exited with code ${result.exit_code}`, type: 'errExit' }, { text: `  ${elapsed} ms · ${result.language} ${result.version}`, type: 'meta', ts: endTs() }];

      setTerminalLogs((prev) => [...prev, ...output, ...footer]);
    } catch (err) {
      setTerminalLogs((prev) => [...prev,
        { text: `✖ ${err.message}`, type: 'error' },
        { text: '', type: 'divider' },
        { text: '✘ Execution failed', type: 'errExit' },
        { text: `  ${(performance.now() - t0).toFixed(2)} ms`, type: 'meta', ts: endTs() },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (isDashboard) {
    return (
      <Dashboard
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        roomInput={roomInput}
        setRoomInput={setRoomInput}
        usernameInput={usernameInput}
        setUsernameInput={setUsernameInput}
        onSubmit={handleJoinRoomSubmit}
      />
    );
  }

  // ── Workspace ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {/* Inject remote-cursor CSS generated by Yjs awareness */}
      <style>{dynamicStyles}</style>

      <Header
        currentRoom={currentRoom}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onLeaveRoom={handleLeaveRoom}
        copiedLink={copiedLink}
        onCopyLink={handleCopyLink}
        activeFile={activeFile}
        isRunning={isRunning}
        onRunCode={runCode}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineWrap={lineWrap}
        setLineWrap={setLineWrap}
        minimap={minimap}
        setMinimap={setMinimap}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isAiOpen={isAiOpen}
        setIsAiOpen={setIsAiOpen}
        aiAvailable={aiAvailable}
        isTelemetryOpen={isTelemetryOpen}
        setIsTelemetryOpen={setIsTelemetryOpen}
      />

      {/* Main content region */}
      <div style={{ display: 'flex', flexGrow: 1, position: 'relative', overflow: 'hidden' }}>

        <Sidebar
          files={files}
          fileMetadata={fileMetadata}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          awarenessRef={awarenessRef}
          collaborators={collaborators}
          yFilesMapRef={yFilesMapRef}
          yFileMetadataMapRef={yFileMetadataMapRef}
          modelsRef={modelsRef}
        />

        {/* Editor + terminal column */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            {activeFile ? (
              <Editor
                height="100%"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                defaultLanguage="javascript"
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: minimap },
                  fontSize,
                  wordWrap: lineWrap,
                  automaticLayout: true,
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>📂</span>
                <span>No active file selected. Click a file in the sidebar to open it.</span>
              </div>
            )}
          </div>

          {isTerminalOpen && (
            <Terminal
              activeFile={activeFile}
              isRunning={isRunning}
              terminalLogs={terminalLogs}
              stdin={stdin}
              onStdinChange={setStdin}
              onClear={() => setTerminalLogs([])}
              onRerun={runCode}
              onClose={() => setIsTerminalOpen(false)}
            />
          )}
        </div>

        <AiPanel
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          activeFile={activeFile}
          selectedLanguage={selectedLanguage}
          getEditorCode={getEditorCode}
          onApplyFix={applyAiFix}
          aiAvailable={aiAvailable}
        />

        <TelemetrySidebar
          isOpen={isTelemetryOpen}
          theme={theme}
          latency={latency}
          setLatency={setLatency}
          packetLoss={packetLoss}
          setPacketLoss={setPacketLoss}
          logs={logs}
        />
      </div>
    </div>
  );
}
