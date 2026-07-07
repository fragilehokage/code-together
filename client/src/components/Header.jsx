import React, { useRef, useEffect } from 'react';

export default function Header({
  currentRoom,
  theme,
  onToggleTheme,
  onLeaveRoom,
  copiedLink,
  onCopyLink,
  activeFile,
  isRunning,
  onRunCode,
  selectedLanguage,
  onLanguageChange,
  fontSize,
  setFontSize,
  lineWrap,
  setLineWrap,
  minimap,
  setMinimap,
  showSettings,
  setShowSettings,
  isAiOpen,
  setIsAiOpen,
  aiAvailable,
  isTelemetryOpen,
  setIsTelemetryOpen,
}) {
  const settingsRef = useRef(null);
  useEffect(() => {
    if (!showSettings) return;
    const handleOutsideClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSettings, setShowSettings]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        height: '52px',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onLeaveRoom}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            padding: '5px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--btn-secondary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Leave
        </button>

        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Code Together
        </span>

        <span
          style={{
            fontSize: '12px',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--btn-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {currentRoom}
        </span>

        <button
          onClick={onCopyLink}
          className={`copy-link-btn ${copiedLink ? 'copy-link-success' : ''}`}
        >
          {copiedLink ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '5px 8px',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        {/* Run */}
        {activeFile && (
          <button
            onClick={onRunCode}
            disabled={isRunning}
            style={{
              backgroundColor: '#16a34a',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        )}

        {/* Language selector */}
        {activeFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Language</span>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              style={{
                backgroundColor: 'var(--app-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                padding: '5px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="ruby">Ruby</option>
              <option value="php">PHP</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        )}

        {/* Editor settings */}
        <div className="settings-menu-container" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              backgroundColor: 'var(--btn-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Settings
          </button>

          {showSettings && (
            <div className="settings-menu">
              <div
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
              >
                Editor
              </div>

              <div className="settings-row">
                <span className="settings-label">Font size</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="settings-select"
                >
                  <option value={12}>12</option>
                  <option value={14}>14</option>
                  <option value={16}>16</option>
                  <option value={18}>18</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="settings-row">
                <span className="settings-label">Line wrap</span>
                <select
                  value={lineWrap}
                  onChange={(e) => setLineWrap(e.target.value)}
                  className="settings-select"
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>
              </div>

              <div className="settings-row">
                <span className="settings-label">Minimap</span>
                <input
                  type="checkbox"
                  checked={minimap}
                  onChange={(e) => setMinimap(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Assistant toggle */}
        <button
          onClick={() => setIsAiOpen(!isAiOpen)}
          style={{
            backgroundColor: isAiOpen ? '#4f46e5' : 'var(--btn-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: isAiOpen ? '#fff' : 'var(--text-primary)',
            padding: '5px 10px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          title={aiAvailable ? 'Open assistant' : 'Assistant unavailable — set GEMINI_API_KEY on server'}
        >
          {aiAvailable ? 'Assistant' : 'Assistant (off)'}
        </button>

        {/* Network panel toggle */}
        <button
          onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
          style={{
            padding: '5px 10px',
            backgroundColor: isTelemetryOpen ? 'var(--btn-secondary-hover)' : 'var(--btn-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Network
        </button>
      </div>
    </div>
  );
}
