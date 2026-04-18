const express = require('express');
const router = express.Router();
const { tracePython } = require('../utils/pythonTracer');
const { traceJavaScript } = require('../utils/jsTracer');
const { traceTypeScript } = require('../utils/typescriptTracer');
const { traceJava } = require('../utils/javaTracer');
const { traceCpp } = require('../utils/cppTracer');
const { detectLanguage } = require('../utils/languageDetector');

const SUPPORTED_LANGUAGES = new Set(['python', 'javascript', 'typescript', 'java', 'cpp']);

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
        error: `Step-by-step execution is supported for Python, JavaScript, TypeScript, Java, and C++ only (detected: ${lang}).`,
      });
    }

    let result;
    if (lang === 'python') {
      result = await tracePython(code);
    } else if (lang === 'typescript') {
      result = await traceTypeScript(code);
    } else if (lang === 'java') {
      result = await traceJava(code);
    } else if (lang === 'cpp') {
      result = await traceCpp(code);
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
