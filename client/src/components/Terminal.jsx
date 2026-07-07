import React, { useRef, useEffect } from 'react';

export default function Terminal({
  activeFile,
  isRunning,
  terminalLogs,
  stdin,
  onStdinChange,
  onClear,
  onRerun,
  onClose,
}) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const getStyle = (type) => {
    switch (type) {
      case 'cmd':        return { color: '#38bdf8', bg: 'rgba(56,189,248,0.06)' };
      case 'info':       return { color: '#64748b', bg: 'transparent' };
      case 'stdout':     return { color: '#f0fdf4', bg: 'transparent' };
      case 'warn':       return { color: '#fbbf24', bg: 'rgba(251,191,36,0.06)' };
      case 'error':      return { color: '#f87171', bg: 'rgba(248,113,113,0.08)' };
      case 'errExit':    return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' };
      case 'stacktrace': return { color: '#94a3b8', bg: 'transparent' };
      case 'success':    return { color: '#34d399', bg: 'rgba(52,211,153,0.06)' };
      case 'divider':    return { color: '#334155', bg: 'transparent' };
      case 'meta':       return { color: '#475569', bg: 'transparent' };
      default:           return { color: '#e2e8f0', bg: 'transparent' };
    }
  };

  return (
    <div className="terminal-container">
      {/* Header */}
      <div className="terminal-header">
        <div className="terminal-title">
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isRunning ? '#f59e0b' : '#10b981',
            }}
          />
          <span style={{ color: '#94a3b8' }}>{activeFile}</span>
          <span style={{ marginLeft: '6px', color: isRunning ? '#f59e0b' : '#64748b', fontSize: '11px' }}>
            {isRunning ? 'running' : 'done'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={onClear} className="terminal-close" title="Clear output">
            Clear
          </button>
          <button onClick={onRerun} className="terminal-close" title="Run again" disabled={isRunning}>
            Run again
          </button>
          <button onClick={onClose} className="terminal-close" title="Close">
            Close
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={bodyRef}
        className="terminal-body"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '12.5px',
        }}
      >
        {terminalLogs.map((log, index) => {
          const { color, bg } = getStyle(log.type);
          return (
            <div
              key={index}
              style={{
                color,
                backgroundColor: bg,
                whiteSpace: 'pre-wrap',
                padding: log.type === 'divider' ? '4px 0' : '1px 0',
                borderTop: log.type === 'divider' ? '1px solid #1e293b' : 'none',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              {log.ts && (
                <span style={{ color: '#334155', flexShrink: 0, fontSize: '11px', marginTop: '1px' }}>
                  {log.ts}
                </span>
              )}
              <span style={{ flex: 1 }}>{log.text}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace', flexShrink: 0 }}>
          Input:
        </span>
        <input
          type="text"
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="Program input (stdin)"
          disabled={isRunning}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#94a3b8',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        />
      </div>
    </div>
  );
}
