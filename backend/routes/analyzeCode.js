const express = require('express');
const router = express.Router();
const { analyzeCode } = require('../utils/codeAnalyzer');
const { detectLanguage } = require('../utils/languageDetector');

// POST /api/analyze
router.post('/analyze', (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required and must be a string' });
    }

    const detectedLanguage = language || detectLanguage(code);
    const analysis = analyzeCode(code, detectedLanguage);

    res.json({
      language: detectedLanguage,
      ...analysis,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// POST /api/detect-language
router.post('/detect-language', (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }

    const language = detectLanguage(code);
    res.json({ language });
  } catch (err) {
    console.error('Detection error:', err);
    res.status(500).json({ error: 'Failed to detect language' });
  }
});

module.exports = router;
