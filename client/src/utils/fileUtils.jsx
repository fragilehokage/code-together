import React from 'react';

/**
 * Maps a file extension to a Monaco editor language identifier.
 * @param {string} filename
 * @returns {string}
 */
export function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'cpp':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'javascript';
  }
}

/**
 * Returns a colored badge/icon element for a given filename based on its extension.
 * @param {string} filename
 * @returns {JSX.Element}
 */
export function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return <span style={{ color: '#facc15', marginRight: '8px', fontWeight: 'bold' }}>JS</span>;
    case 'py':
      return <span style={{ color: '#60a5fa', marginRight: '8px', fontWeight: 'bold' }}>🐍</span>;
    case 'html':
      return <span style={{ color: '#fb923c', marginRight: '8px', fontWeight: 'bold' }}>🌐</span>;
    case 'css':
      return <span style={{ color: '#38bdf8', marginRight: '8px', fontWeight: 'bold' }}>🎨</span>;
    case 'json':
      return <span style={{ color: '#a78bfa', marginRight: '8px', fontWeight: 'bold' }}>{}</span>;
    case 'md':
      return <span style={{ color: '#34d399', marginRight: '8px', fontWeight: 'bold' }}>📝</span>;
    default:
      return <span style={{ color: '#94a3b8', marginRight: '8px' }}>📄</span>;
  }
}
