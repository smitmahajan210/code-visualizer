/**
 * Code analyzer - extracts structural information and metrics from code.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function countLines(code) {
  return code.split('\n').length;
}

function countNonEmptyLines(code) {
  return code.split('\n').filter((l) => l.trim().length > 0).length;
}

function countCommentLines(code, language) {
  const lines = code.split('\n');
  let count = 0;
  let inBlockComment = false;

  const singleLineComments = {
    javascript: '//',
    typescript: '//',
    java: '//',
    cpp: '//',
    csharp: '//',
    rust: '//',
    go: '//',
    php: '//',
    swift: '//',
    python: '#',
    ruby: '#',
    bash: '#',
    r: '#',
    plaintext: null,
    html: null,
    css: null,
    sql: '--',
  };

  const single = singleLineComments[language] || '//';

  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlockComment) {
      count++;
      if (trimmed.includes('*/') || trimmed.includes('-->') || trimmed.includes('#}')) {
        inBlockComment = false;
      }
    } else if (trimmed.startsWith('/*') || trimmed.startsWith('<!--') || trimmed.startsWith('{#')) {
      inBlockComment = true;
      count++;
      if (trimmed.includes('*/') || trimmed.includes('-->') || trimmed.includes('#}')) {
        inBlockComment = false;
      }
    } else if (single && trimmed.startsWith(single)) {
      count++;
    } else if (language === 'python' && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
      count++;
    }
  }
  return count;
}

// ─── Per-language parsers ────────────────────────────────────────────────────

function parseJavaScript(code) {
  const functions = [];
  const classes = [];
  const variables = [];
  const imports = [];

  // Named functions
  const funcRegex = /(?:^|\s)(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/gm;
  let m;
  while ((m = funcRegex.exec(code)) !== null) {
    functions.push({ name: m[1], params: m[2].trim(), type: 'function' });
  }

  // Arrow functions assigned to variables
  const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/gm;
  while ((m = arrowRegex.exec(code)) !== null) {
    functions.push({ name: m[1], params: m[2].trim(), type: 'arrow' });
  }

  // Arrow functions with single param (no parens)
  const arrowSingleRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(\w+)\s*=>/gm;
  while ((m = arrowSingleRegex.exec(code)) !== null) {
    functions.push({ name: m[1], params: m[2].trim(), type: 'arrow' });
  }

  // Classes
  const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/gm;
  while ((m = classRegex.exec(code)) !== null) {
    classes.push({ name: m[1], extends: m[2] || null });
  }

  // Variable declarations
  const varRegex = /(?:^|\s)(const|let|var)\s+(\w+)\s*=/gm;
  while ((m = varRegex.exec(code)) !== null) {
    // Skip if it's a function
    const isFn = functions.some((f) => f.name === m[2]);
    if (!isFn) {
      variables.push({ name: m[2], kind: m[1] });
    }
  }

  // Imports
  const importRegex = /^import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/gm;
  while ((m = importRegex.exec(code)) !== null) {
    imports.push(m[1]);
  }
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;
  while ((m = requireRegex.exec(code)) !== null) {
    imports.push(m[1]);
  }

  return { functions, classes, variables, imports: [...new Set(imports)] };
}

function parseTypeScript(code) {
  const base = parseJavaScript(code);
  const interfaces = [];
  const types = [];

  let m;
  const ifaceRegex = /interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{/gm;
  while ((m = ifaceRegex.exec(code)) !== null) {
    interfaces.push({ name: m[1] });
  }

  const typeRegex = /type\s+(\w+)\s*=/gm;
  while ((m = typeRegex.exec(code)) !== null) {
    types.push({ name: m[1] });
  }

  return { ...base, interfaces, types };
}

function parsePython(code) {
  const functions = [];
  const classes = [];
  const variables = [];
  const imports = [];

  let m;
  const funcRegex = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)\s*(?:->[^:]+)?:/gm;
  while ((m = funcRegex.exec(code)) !== null) {
    const indent = m[1].length;
    functions.push({ name: m[2], params: m[3].trim(), type: indent > 0 ? 'method' : 'function' });
  }

  const classRegex = /^class\s+(\w+)(?:\s*\(([^)]*)\))?\s*:/gm;
  while ((m = classRegex.exec(code)) !== null) {
    classes.push({ name: m[1], extends: m[2] ? m[2].trim() : null });
  }

  const varRegex = /^(\w+)\s*=/gm;
  while ((m = varRegex.exec(code)) !== null) {
    const isFn = functions.some((f) => f.name === m[1]);
    const isCls = classes.some((c) => c.name === m[1]);
    if (!isFn && !isCls && m[1] !== '_') {
      variables.push({ name: m[1], kind: 'variable' });
    }
  }

  const importRegex = /^(?:import\s+(\S+)|from\s+(\S+)\s+import)/gm;
  while ((m = importRegex.exec(code)) !== null) {
    imports.push(m[1] || m[2]);
  }

  return { functions, classes, variables, imports: [...new Set(imports)] };
}

function parseJava(code) {
  const functions = [];
  const classes = [];
  const variables = [];
  const imports = [];

  let m;
  const classRegex = /(?:public|private|protected|abstract|final|\s)*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/gm;
  while ((m = classRegex.exec(code)) !== null) {
    classes.push({ name: m[1], extends: m[2] || null, implements: m[3] ? m[3].trim() : null });
  }

  const methodRegex = /(?:public|private|protected|static|final|abstract|\s)+(\w[\w<>\[\]]*)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*[\{;]/gm;
  while ((m = methodRegex.exec(code)) !== null) {
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(m[2])) {
      functions.push({ name: m[2], returnType: m[1], params: m[3].trim(), type: 'method' });
    }
  }

  const importRegex = /^import\s+([\w.]+)\s*;/gm;
  while ((m = importRegex.exec(code)) !== null) {
    imports.push(m[1]);
  }

  const varRegex = /(?:private|protected|public|static|final|\s)+(?:int|double|float|long|String|boolean|char|byte|short|[\w<>\[\]]+)\s+(\w+)\s*[=;]/gm;
  while ((m = varRegex.exec(code)) !== null) {
    variables.push({ name: m[1], kind: 'field' });
  }

  return { functions, classes, variables, imports: [...new Set(imports)] };
}

function parseCpp(code) {
  const functions = [];
  const classes = [];
  const variables = [];
  const includes = [];

  let m;
  const includeRegex = /#include\s*[<"]([^>"]+)[>"]/gm;
  while ((m = includeRegex.exec(code)) !== null) {
    includes.push(m[1]);
  }

  const classRegex = /(?:class|struct)\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+(\w+))?\s*\{/gm;
  while ((m = classRegex.exec(code)) !== null) {
    classes.push({ name: m[1], extends: m[2] || null });
  }

  const funcRegex = /(?:[\w:*&<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\s*\{/gm;
  while ((m = funcRegex.exec(code)) !== null) {
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(m[1])) {
      functions.push({ name: m[1], params: m[2].trim(), type: 'function' });
    }
  }

  return { functions, classes, variables, imports: includes };
}

function parseHtml(code) {
  const tags = [];
  const ids = [];
  const classNames = [];

  let m;
  const tagRegex = /<(\w+)[\s>]/gm;
  const tagCounts = {};
  while ((m = tagRegex.exec(code)) !== null) {
    const tag = m[1].toLowerCase();
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  for (const [tag, count] of Object.entries(tagCounts)) {
    tags.push({ name: tag, count });
  }

  const idRegex = /id=["'](\w[\w-]*)["']/gm;
  while ((m = idRegex.exec(code)) !== null) {
    ids.push(m[1]);
  }

  const classRegex = /class=["']([^"']+)["']/gm;
  while ((m = classRegex.exec(code)) !== null) {
    m[1].split(/\s+/).forEach((c) => { if (c) classNames.push(c); });
  }

  return {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    htmlTags: tags.sort((a, b) => b.count - a.count),
    htmlIds: [...new Set(ids)],
    htmlClasses: [...new Set(classNames)],
  };
}

function parseCss(code) {
  const selectors = [];
  const properties = [];

  let m;
  const selectorRegex = /([.#]?[\w-]+(?::[:\w-]+)?)\s*\{/gm;
  while ((m = selectorRegex.exec(code)) !== null) {
    selectors.push(m[1]);
  }

  const propRegex = /^\s*([\w-]+)\s*:/gm;
  const propCounts = {};
  while ((m = propRegex.exec(code)) !== null) {
    const prop = m[1];
    propCounts[prop] = (propCounts[prop] || 0) + 1;
  }
  for (const [prop, count] of Object.entries(propCounts)) {
    properties.push({ name: prop, count });
  }

  return {
    functions: [],
    classes: selectors.filter((s) => s.startsWith('.')).map((s) => ({ name: s })),
    variables: [],
    imports: [],
    cssSelectors: selectors,
    cssProperties: properties.sort((a, b) => b.count - a.count),
  };
}

function parseSql(code) {
  const tables = [];
  const queries = [];

  let m;
  const tableRegex = /(?:FROM|JOIN|INTO|TABLE)\s+(\w+)/gi;
  while ((m = tableRegex.exec(code)) !== null) {
    tables.push(m[1]);
  }

  const queryTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
  for (const qt of queryTypes) {
    const count = (code.match(new RegExp(`\\b${qt}\\b`, 'gi')) || []).length;
    if (count > 0) queries.push({ type: qt, count });
  }

  return {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    sqlTables: [...new Set(tables)],
    sqlQueryTypes: queries,
  };
}

function parseGeneric(code) {
  return { functions: [], classes: [], variables: [], imports: [] };
}

// ─── Main analyzer ───────────────────────────────────────────────────────────

const PARSERS = {
  javascript: parseJavaScript,
  typescript: parseTypeScript,
  python: parsePython,
  java: parseJava,
  cpp: parseCpp,
  html: parseHtml,
  css: parseCss,
  sql: parseSql,
};

function analyzeCode(code, language) {
  const totalLines = countLines(code);
  const nonEmptyLines = countNonEmptyLines(code);
  const commentLines = countCommentLines(code, language);
  const codeLines = nonEmptyLines - commentLines;
  const avgLineLength = code.length > 0 ? Math.round(code.length / totalLines) : 0;
  const charCount = code.length;

  const parser = PARSERS[language] || parseGeneric;
  const structure = parser(code);

  return {
    metrics: {
      totalLines,
      nonEmptyLines,
      commentLines,
      codeLines,
      avgLineLength,
      charCount,
      functionCount: structure.functions ? structure.functions.length : 0,
      classCount: structure.classes ? structure.classes.length : 0,
    },
    structure,
  };
}

module.exports = { analyzeCode };
