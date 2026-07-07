/**
 * POST /api/run
 * Executes code via the Piston public API and returns stdout/stderr.
 *
 * Fix #13: On startup the route fetches the live Piston /runtimes list and
 *          resolves the highest available version for each language we support.
 *          If the fetch fails we fall back to the hardcoded defaults so the
 *          server still starts cleanly without internet access.
 */

const { Router } = require('express');
const axios = require('axios');

const router = Router();

const PISTON_API = 'https://emkc.org/api/v2/piston';

// Hardcoded fallbacks — used when the live version check fails
const FALLBACK_LANG_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3'  },
  python:     { language: 'python',     version: '3.10.0' },
  java:       { language: 'java',       version: '15.0.2' },
  cpp:        { language: 'c++',        version: '10.2.0' },
  c:          { language: 'c',          version: '10.2.0' },
  rust:       { language: 'rust',       version: '1.50.0' },
  go:         { language: 'go',         version: '1.16.2' },
  php:        { language: 'php',        version: '8.2.3'  },
  ruby:       { language: 'ruby',       version: '3.0.1'  },
};

// Maps our language identifiers → Piston language name
const LANG_NAME_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python:     'python',
  java:       'java',
  cpp:        'c++',
  c:          'c',
  rust:       'rust',
  go:         'go',
  php:        'php',
  ruby:       'ruby',
};

// Resolved at startup; falls back to FALLBACK_LANG_MAP on error
let PISTON_LANG_MAP = { ...FALLBACK_LANG_MAP };

/**
 * Fetch the Piston /runtimes list and pick the latest version for each
 * language we care about.
 */
async function resolvePistonVersions() {
  try {
    const { data: runtimes } = await axios.get(`${PISTON_API}/runtimes`, { timeout: 8000 });

    const resolved = {};
    for (const [ourKey, pistonName] of Object.entries(LANG_NAME_MAP)) {
      // Collect all matching runtimes and sort by version descending
      const matches = runtimes
        .filter((r) => r.language === pistonName || r.aliases?.includes(pistonName))
        .sort((a, b) => {
          // Semantic version compare (best-effort)
          const parts = (v) => v.split('.').map(Number);
          const [aMaj, aMin = 0, aPat = 0] = parts(a.version);
          const [bMaj, bMin = 0, bPat = 0] = parts(b.version);
          return bMaj - aMaj || bMin - aMin || bPat - aPat;
        });

      if (matches.length > 0) {
        resolved[ourKey] = { language: matches[0].language, version: matches[0].version };
      } else {
        resolved[ourKey] = FALLBACK_LANG_MAP[ourKey];
      }
    }

    PISTON_LANG_MAP = resolved;
    console.log('✅  Piston runtime versions resolved:', Object.entries(resolved).map(([k, v]) => `${k}@${v.version}`).join(', '));
  } catch (err) {
    console.warn('⚠️  Could not fetch Piston runtimes — using hardcoded fallbacks.', err.message);
  }
}

// Kick off the version resolution immediately (non-blocking)
resolvePistonVersions();

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { code, language, stdin } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  const langConfig = PISTON_LANG_MAP[language] || PISTON_LANG_MAP.javascript;

  try {
    const response = await axios.post(
      `${PISTON_API}/execute`,
      {
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: 'main', content: code }],
        stdin: stdin || '',
      },
      { timeout: 20000 }
    );

    const { run, compile } = response.data;
    res.json({
      stdout:          run?.stdout || '',
      stderr:          run?.stderr || '',
      compile_output:  compile?.stderr || compile?.stdout || '',
      exit_code:       run?.code ?? 0,
      language:        langConfig.language,
      version:         langConfig.version,
    });
  } catch (err) {
    console.error('❌ Code execution error:', err.message);
    res.status(500).json({
      error:   'Code execution service unavailable.',
      details: err.message,
    });
  }
});

module.exports = router;
