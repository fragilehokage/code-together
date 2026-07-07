import { getApiUrl } from './config';

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.details || `Request failed (${res.status})`);
  }
  return data;
}

export async function checkHealth() {
  const res = await fetch(getApiUrl('/api/health'));
  return parseJsonResponse(res);
}

export async function runCode({ code, language, stdin = '' }) {
  const res = await fetch(getApiUrl('/api/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, stdin }),
  });
  return parseJsonResponse(res);
}

export async function chatWithAi({ message, code, language, history }) {
  const res = await fetch(getApiUrl('/api/ai/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, code, language, history }),
  });
  return parseJsonResponse(res);
}

export async function fixCodeWithAi({ code, language, error }) {
  const res = await fetch(getApiUrl('/api/ai/fix'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, error }),
  });
  return parseJsonResponse(res);
}
