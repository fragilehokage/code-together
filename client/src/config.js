/**
 * API and WebSocket URL helpers.
 * Dev: Vite proxies /api; WebSocket connects directly to the backend port.
 * Production: same-origin relative URLs when served by Express.
 */

const DEV_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4050/ws';
const API_BASE = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function getWsUrl(room) {
  if (import.meta.env.DEV) {
    return `${DEV_WS_URL}?room=${encodeURIComponent(room)}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(room)}`;
}

export function getRunLanguage(filename, selectedLanguage) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const byExt = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
  };
  return byExt[ext] || selectedLanguage || 'javascript';
}
