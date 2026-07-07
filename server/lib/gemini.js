/**
 * Gemini AI client initialisation.
 * Exports `getGeminiModel()` which returns the model instance, or null when
 * the API key is not configured.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('./config');

let geminiModel = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

function getGeminiModel() {
  return geminiModel;
}

module.exports = { getGeminiModel };
