/**
 * AI routes
 *   POST /api/ai/chat  — multi-turn code assistant chat
 *   POST /api/ai/fix   — auto-fix the provided code snippet
 */

const { Router } = require('express');
const { getGeminiModel } = require('../lib/gemini');

const router = Router();

// ── Chat ──────────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const geminiModel = getGeminiModel();
  if (!geminiModel) {
    return res.status(503).json({ error: 'AI not configured. Set GEMINI_API_KEY in .env' });
  }

  const { message, code, language, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const systemPrompt = `You are an expert AI coding assistant embedded in a real-time collaborative IDE.
You help developers understand, write, fix, and improve code.
${code ? `\nThe developer is currently working on a ${language || 'code'} file. Here is the current code:\n\`\`\`${language || ''}\n${code}\n\`\`\`` : ''}
Keep responses concise, practical, and well-formatted with code blocks where helpful.
When suggesting code fixes, provide the complete corrected snippet.`;

    const chatHistory = (history || []).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood! I'm ready to help with your code. What do you need?" }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error('❌ Gemini chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Fix ───────────────────────────────────────────────────────────────────────
router.post('/fix', async (req, res) => {
  const geminiModel = getGeminiModel();
  if (!geminiModel) {
    return res.status(503).json({ error: 'AI not configured.' });
  }

  const { code, language, error: runtimeError } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  try {
    const prompt = `Fix the following ${language || 'code'} code${runtimeError ? ` that has this error: "${runtimeError}"` : ''}.
Return ONLY the corrected code with no explanation, wrapped in a code block.

\`\`\`${language || ''}
${code}
\`\`\``;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const codeMatch = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const fixedCode = codeMatch ? codeMatch[1].trim() : text.trim();

    res.json({ fixedCode, explanation: text });
  } catch (err) {
    console.error('❌ Gemini fix error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
