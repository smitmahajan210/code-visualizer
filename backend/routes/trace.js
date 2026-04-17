const express = require('express');
const router = express.Router();
const { tracePython } = require('../utils/pythonTracer');
const { traceJavaScript } = require('../utils/jsTracer');
const { detectLanguage } = require('../utils/languageDetector');

const SUPPORTED_LANGUAGES = new Set(['python', 'javascript']);

// POST /api/trace
router.post('/trace', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required and must be a string' });
    }

    const lang = (language && language !== 'auto')
      ? language
      : detectLanguage(code);

    if (!SUPPORTED_LANGUAGES.has(lang)) {
      return res.status(400).json({
        error: `Step-by-step execution is supported for Python and JavaScript only (detected: ${lang}).`,
      });
    }

    let result;
    if (lang === 'python') {
      result = await tracePython(code);
    } else {
      result = traceJavaScript(code);
    }

    res.json({ language: lang, ...result });
  } catch (err) {
    console.error('Trace error:', err);
    res.status(500).json({ error: err.message || 'Failed to trace code' });
  }
});

module.exports = router;
