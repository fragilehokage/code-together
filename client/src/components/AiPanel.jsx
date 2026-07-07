import { useState, useRef, useEffect } from 'react';
import { chatWithAi, fixCodeWithAi } from '../api';

function renderMarkdown(text) {
  const parts = [];
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match;

  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', content: text.slice(last, match.index) });
    }
    parts.push({ type: 'code', lang: match[1] || '', content: match[2].trimEnd() });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) });
  }

  return parts.map((part, i) => {
    if (part.type === 'code') {
      return (
        <pre
          key={i}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '10px 12px',
            overflowX: 'auto',
            fontSize: '12px',
            lineHeight: '1.5',
            margin: '6px 0',
            whiteSpace: 'pre',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: '#e2e8f0',
          }}
        >
          {part.lang && (
            <span style={{ color: '#64748b', fontSize: '10px', display: 'block', marginBottom: '4px' }}>
              {part.lang}
            </span>
          )}
          {part.content}
        </pre>
      );
    }

    const rendered = part.content
      .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
      .map((chunk, j) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return <strong key={j}>{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith('*') && chunk.endsWith('*')) {
          return <em key={j}>{chunk.slice(1, -1)}</em>;
        }
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
          return (
            <code
              key={j}
              style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '11px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: '#38bdf8',
              }}
            >
              {chunk.slice(1, -1)}
            </code>
          );
        }
        return chunk;
      });

    return (
      <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
        {rendered}
      </span>
    );
  });
}

export default function AiPanel({
  isOpen,
  onClose,
  activeFile,
  selectedLanguage,
  getEditorCode,
  onApplyFix,
  aiAvailable,
}) {
  const welcomeMessage = aiAvailable
    ? 'Ask a question about your code, or click "Fix" to have it corrected automatically.'
    : 'Assistant is not available. Set GEMINI_API_KEY in server/.env to enable it.';

  const [messages, setMessages] = useState([{ role: 'assistant', content: welcomeMessage }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: welcomeMessage }];
      }
      return prev;
    });
  }, [aiAvailable]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !aiAvailable) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const code = getEditorCode();
      const history = nextMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const { reply } = await chatWithAi({
        message: text,
        code,
        language: selectedLanguage,
        history: history.slice(0, -1),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFixFile = async () => {
    if (fixing || !aiAvailable || !activeFile) return;
    setFixing(true);

    try {
      const code = getEditorCode();
      const { fixedCode } = await fixCodeWithAi({ code, language: selectedLanguage });
      if (fixedCode && onApplyFix) {
        onApplyFix(fixedCode);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Updated ${activeFile}. Check the changes before saving.`,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Could not fix the file: ${err.message}` },
      ]);
    } finally {
      setFixing(false);
    }
  };

  const handleClear = () => {
    setMessages([{ role: 'assistant', content: welcomeMessage }]);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Assistant
        </h3>
        <div className="ai-panel-actions">
          <button
            type="button"
            className="ai-close-btn"
            onClick={handleClear}
            title="Clear chat"
          >
            Clear
          </button>
          <button
            type="button"
            className="ai-fix-btn"
            onClick={handleFixFile}
            disabled={!aiAvailable || fixing || !activeFile}
            title="Fix the current file"
          >
            {fixing ? 'Fixing...' : 'Fix'}
          </button>
          <button type="button" className="ai-close-btn" onClick={onClose} title="Close">
            Close
          </button>
        </div>
      </div>

      <div className="ai-panel-body" ref={bodyRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-label">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="ai-message-text">
              {renderMarkdown(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message ai-message-assistant">
            <div className="ai-message-label">Assistant</div>
            <div className="ai-message-text" style={{ color: 'var(--text-secondary)' }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form className="ai-panel-input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={aiAvailable ? 'Ask about your code...' : 'Assistant unavailable'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!aiAvailable || loading}
        />
        <button type="submit" disabled={!aiAvailable || loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
