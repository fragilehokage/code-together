/**
 * Centralised server configuration.
 * All values are read once at startup so the rest of the app imports this
 * module rather than calling process.env directly.
 */

const PORT = Number(process.env.PORT) || 4050;
const MONGO_URI = process.env.MONGO_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const DB_NAME = process.env.MONGO_DB_NAME || 'collaborative_ide';
const COLLECTION_NAME = 'documents';

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  `http://localhost:${PORT}`,
];

const ALLOWED_ORIGINS = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

// Fail fast if Mongo is not configured
if (!MONGO_URI || MONGO_URI.includes('<username>') || MONGO_URI.includes('<password>')) {
  console.error('❌  MONGO_URI is not configured.');
  console.error('    Copy server/.env.example to server/.env and set your MongoDB connection string.');
  process.exit(1);
}

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.warn('⚠️  GEMINI_API_KEY not set — AI features will be disabled.');
}

module.exports = {
  PORT,
  MONGO_URI,
  GEMINI_API_KEY,
  NODE_ENV,
  IS_PRODUCTION,
  DB_NAME,
  COLLECTION_NAME,
  ALLOWED_ORIGINS,
};
