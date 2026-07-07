/**
 * GET /api/health
 * Returns server status, AI availability, DB connectivity, and environment.
 */

const { Router } = require('express');
const { getGeminiModel } = require('../lib/gemini');
const { getCollection } = require('../lib/db');
const { NODE_ENV } = require('../lib/config');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    ai: !!getGeminiModel(),
    db: !!getCollection(),
    environment: NODE_ENV,
  });
});

module.exports = router;
