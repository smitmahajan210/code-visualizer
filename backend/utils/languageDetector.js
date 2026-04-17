/**
 * Language detector - inspects code patterns/keywords to guess the language.
 */

const LANGUAGE_PATTERNS = [
  {
    language: 'python',
    patterns: [
      /^\s*def\s+\w+\s*\(/m,
      /^\s*class\s+\w+.*:/m,
      /^\s*import\s+\w+/m,
      /^\s*from\s+\w+\s+import/m,
      /print\s*\(/,
      /:\s*$/m,
      /#.*$/m,
    ],
    weight: 0,
  },
  {
    language: 'javascript',
    patterns: [
      /\bconst\b|\blet\b|\bvar\b/,
      /=>\s*\{/,
      /\bfunction\s+\w+\s*\(/,
      /console\.log\s*\(/,
      /require\s*\(|import\s+.*from/,
      /\bmodule\.exports\b/,
      /\bdocument\.\w+/,
    ],
    weight: 0,
  },
  {
    language: 'typescript',
    patterns: [
      /:\s*(string|number|boolean|any|void|never|unknown)\b/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /<\w+>/,
      /\bReadonly\b|\bPartial\b|\bRequired\b/,
      /import\s+.*from\s+['"].*['"]/,
    ],
    weight: 0,
  },
  {
    language: 'java',
    patterns: [
      /\bpublic\s+(static\s+)?class\b/,
      /\bSystem\.out\.println\s*\(/,
      /\bpublic\s+static\s+void\s+main\b/,
      /\bimport\s+java\./,
      /\b(public|private|protected)\s+\w+\s+\w+\s*\(/,
      /@Override/,
    ],
    weight: 0,
  },
  {
    language: 'cpp',
    patterns: [
      /#include\s*<\w+>/,
      /\bstd::/,
      /\bcout\s*<</,
      /\bint\s+main\s*\(/,
      /\b(vector|map|set|pair)\s*</,
      /\b(nullptr|auto)\b/,
    ],
    weight: 0,
  },
  {
    language: 'csharp',
    patterns: [
      /\busing\s+System/,
      /\bnamespace\s+\w+/,
      /\bConsole\.Write(Line)?\s*\(/,
      /\bpublic\s+class\b/,
      /\b(string|int|bool|double)\b.*=>/,
    ],
    weight: 0,
  },
  {
    language: 'html',
    patterns: [
      /<html/i,
      /<\/?(div|span|p|a|ul|li|head|body|script|style)\b/i,
      /<!DOCTYPE\s+html/i,
      /<\w+\s+\w+=".*">/,
    ],
    weight: 0,
  },
  {
    language: 'css',
    patterns: [
      /\{[\s\S]*?:\s*[\w#"'%]+;[\s\S]*?\}/,
      /^\s*[\.\#][\w-]+\s*\{/m,
      /@media\s+/,
      /:\s*(flex|grid|block|inline|absolute|relative)\b/,
    ],
    weight: 0,
  },
  {
    language: 'sql',
    patterns: [
      /\bSELECT\b.*\bFROM\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bWHERE\b.*=/i,
      /\bJOIN\b/i,
    ],
    weight: 0,
  },
  {
    language: 'rust',
    patterns: [
      /\bfn\s+\w+\s*\(/,
      /\blet\s+(mut\s+)?\w+/,
      /\bprintln!\s*\(/,
      /\buse\s+std::/,
      /->/,
    ],
    weight: 0,
  },
  {
    language: 'go',
    patterns: [
      /\bpackage\s+\w+/,
      /\bfunc\s+\w+\s*\(/,
      /\bfmt\.Print(ln|f)?\s*\(/,
      /\bimport\s+\(/,
      /:=/,
    ],
    weight: 0,
  },
  {
    language: 'ruby',
    patterns: [
      /\bdef\s+\w+/,
      /\bputs\s+/,
      /\bend\b/,
      /\battr_(reader|writer|accessor)\b/,
      /\brequire\s+['"]/,
    ],
    weight: 0,
  },
  {
    language: 'php',
    patterns: [
      /<\?php/,
      /\$\w+\s*=/,
      /\becho\s+/,
      /\bfunction\s+\w+\s*\(/,
      /\b(array|isset|empty|die|exit)\s*\(/,
    ],
    weight: 0,
  },
];

function detectLanguage(code) {
  if (!code || !code.trim()) return 'plaintext';

  const results = LANGUAGE_PATTERNS.map((lang) => {
    const matches = lang.patterns.filter((pattern) => pattern.test(code)).length;
    return { language: lang.language, score: matches };
  });

  results.sort((a, b) => b.score - a.score);

  if (results[0].score === 0) return 'plaintext';
  return results[0].language;
}

module.exports = { detectLanguage };
