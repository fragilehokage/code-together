import React, { useState, useRef, useEffect } from 'react';
import * as Y from 'yjs';
import { getFileIcon } from '../utils/fileUtils';

export default function Sidebar({
  files,
  fileMetadata,
  activeFile,
  setActiveFile,
  awarenessRef,
  collaborators,
  yFilesMapRef,
  yFileMetadataMapRef,
  modelsRef,
}) {
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (renamingFile && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFile]);

  const handleCreateFile = (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    if (yFilesMapRef.current.has(newFileName)) {
      alert('A file with that name already exists.');
      return;
    }

    const newText = new Y.Text();
    const ext = newFileName.split('.').pop().toLowerCase();
    if (ext === 'html') {
      newText.insert(0, '<!DOCTYPE html>\n<html>\n<head>\n  <title>Page</title>\n</head>\n<body>\n\n</body>\n</html>\n');
    } else if (ext === 'css') {
      newText.insert(0, 'body {\n  \n}\n');
    } else {
      newText.insert(0, '');
    }

    yFilesMapRef.current.set(newFileName, newText);

    const creator = sessionStorage.getItem('username') || 'Unknown';
    const creationTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    yFileMetadataMapRef.current.set(newFileName, { createdBy: creator, createdAt: creationTime });

    setNewFileName('');
    setShowNewFileForm(false);
    setActiveFile(newFileName);
  };

  const handleDeleteFile = (filename, e) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('You need at least one file in the workspace.');
      return;
    }
    if (confirm(`Delete "${filename}"?`)) {
      yFilesMapRef.current.delete(filename);
      yFileMetadataMapRef.current.delete(filename);
      if (modelsRef.current[filename]) {
        modelsRef.current[filename].dispose();
        delete modelsRef.current[filename];
      }
    }
  };

  const startRename = (filename, e) => {
    e.stopPropagation();
    setRenamingFile(filename);
    setRenameValue(filename);
  };

  const commitRename = () => {
    const newName = renameValue.trim();
    if (!newName || newName === renamingFile) {
      setRenamingFile(null);
      return;
    }
    if (yFilesMapRef.current.has(newName)) {
      alert(`A file named "${newName}" already exists.`);
      return;
    }

    const oldText = yFilesMapRef.current.get(renamingFile);
    const newText = new Y.Text();
    if (oldText) newText.insert(0, oldText.toString());
    yFilesMapRef.current.set(newName, newText);

    const oldMeta = yFileMetadataMapRef.current.get(renamingFile);
    if (oldMeta) yFileMetadataMapRef.current.set(newName, oldMeta);

    yFilesMapRef.current.delete(renamingFile);
    yFileMetadataMapRef.current.delete(renamingFile);

    if (modelsRef.current[renamingFile]) {
      modelsRef.current[renamingFile].dispose();
      delete modelsRef.current[renamingFile];
    }

    if (activeFile === renamingFile) setActiveFile(newName);
    setRenamingFile(null);
  };

  const cancelRename = () => setRenamingFile(null);

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') cancelRename();
  };

  return (
    <div className="sidebar-container">
      {/* Header */}
      <div className="sidebar-header">
        <h3 className="sidebar-title-text">Files</h3>
        <button
          onClick={() => setShowNewFileForm(!showNewFileForm)}
          className="new-file-btn"
        >
          {showNewFileForm ? 'Cancel' : 'New file'}
        </button>
      </div>

      {/* New file form */}
      {showNewFileForm && (
        <form
          onSubmit={handleCreateFile}
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="filename.js"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            style={{
              flexGrow: 1,
              backgroundColor: 'var(--app-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              padding: '5px 8px',
              fontSize: '12px',
              outline: 'none',
            }}
            autoFocus
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#4f46e5',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Create
          </button>
        </form>
      )}

      {/* File list */}
      <div className="file-list">
        {files.map((file) => {
          const meta = fileMetadata[file] || { createdBy: 'System', createdAt: '--:--' };
          const isRenaming = renamingFile === file;

          return (
            <div
              key={file}
              onClick={() => !isRenaming && setActiveFile(file)}
              onDoubleClick={(e) => startRename(file, e)}
              className={`file-item ${activeFile === file ? 'active' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2px' }}
              title="Double-click to rename"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flexGrow: 1,
                      background: 'var(--app-bg)',
                      border: '1px solid #4f46e5',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      padding: '3px 6px',
                      fontSize: '13px',
                      outline: 'none',
                      marginRight: '6px',
                    }}
                  />
                ) : (
                  <div className="file-name-container">
                    {getFileIcon(file)}
                    <span>{file}</span>
                  </div>
                )}

                {!isRenaming && (
                  <button
                    onClick={(e) => handleDeleteFile(file, e)}
                    className="delete-file-btn"
                    title="Delete file"
                  >
                    ✕
                  </button>
                )}
              </div>

              {!isRenaming && (
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    marginLeft: '24px',
                    pointerEvents: 'none',
                  }}
                >
                  {meta.createdBy} · {meta.createdAt}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* People online */}
      <div className="collaborator-section">
        <h3 className="sidebar-title-text">People ({collaborators.length})</h3>
        <div className="collaborator-list">
          {collaborators.map((peer) => (
            <div key={peer.clientId} className="collaborator-item">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: peer.color,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                {peer.name}
                {peer.clientId === awarenessRef.current?.clientID ? ' (you)' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
