import React from 'react';

export default function TelemetrySidebar({
  isOpen,
  theme,
  latency,
  setLatency,
  packetLoss,
  setPacketLoss,
  logs,
}) {
  return (
    <div
      style={{
        width: isOpen ? '360px' : '0px',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
        borderLeft: isOpen ? '1px solid var(--border-color)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s ease',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Network simulation controls */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--header-bg)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Network Simulation
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <span>Latency</span>
            <span style={{ color: 'var(--text-secondary)' }}>{latency} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={latency}
            onChange={(e) => setLatency(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <span>Packet loss</span>
            <span style={{ color: 'var(--text-secondary)' }}>{packetLoss}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={packetLoss}
            onChange={(e) => setPacketLoss(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Connection log */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--header-bg)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
          Connection Log
        </div>
      </div>

      <div style={{ flexGrow: 1, padding: '12px 16px', overflowY: 'auto', fontFamily: 'monospace' }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            No activity yet.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '6px 8px',
                marginBottom: '4px',
                borderRadius: '4px',
                fontSize: '11px',
                backgroundColor: log.type === 'DROP' ? 'rgba(239,68,68,0.08)' : 'var(--file-item-hover)',
                color: log.type === 'DROP' ? '#f87171' : 'var(--text-primary)',
                borderLeft: log.type === 'DROP' ? '2px solid #ef4444' : '2px solid var(--border-color)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>
                {log.timestamp}
              </span>
              {log.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
