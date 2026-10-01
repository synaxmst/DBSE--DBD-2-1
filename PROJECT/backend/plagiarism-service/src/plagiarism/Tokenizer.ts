/**
 * Multi-Language Source Code Tokenizer & AST Normalizer for Plagiarism Detection
 */

const KEYWORDS = new Set([
  // C++ / Java / JS / Python common keywords
  'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'default',
  'break', 'continue', 'return', 'try', 'catch', 'throw', 'throws', 'finally',
  'class', 'struct', 'interface', 'enum', 'public', 'private', 'protected',
  'static', 'final', 'const', 'let', 'var', 'def', 'lambda', 'async', 'await',
  'yield', 'function', 'new', 'delete', 'this', 'self', 'super', 'import',
  'export', 'from', 'package', 'include', 'using', 'namespace', 'typedef',
  'template', 'typename', 'true', 'false', 'null', 'none', 'undefined',
  'int', 'long', 'float', 'double', 'char', 'bool', 'boolean', 'void',
  'auto', 'string', 'vector', 'map', 'unordered_map', 'set', 'unordered_set',
  'pair', 'queue', 'deque', 'priority_queue', 'stack', 'list', 'array',
  'in', 'is', 'not', 'and', 'or', 'pass', 'with', 'as', 'assert', 'global',
]);

const OPERATORS_AND_SYMBOLS = new Set([
  '+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=',
  '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '+=', '-=', '*=',
  '/=', '%=', '++', '--', '->', '.', '::', '?', ':', ';', ',',
  '(', ')', '[', ']', '{', '}',
]);

export const stripComments = (code: string, language: string): string => {
  let cleanCode = code;

  if (language === 'python') {
    // Strip Python triple-quoted docstrings/comments
    cleanCode = cleanCode.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '');
    // Strip Python single line comments
    cleanCode = cleanCode.replace(/#.*$/gm, '');
  } else {
    // C++, Java, JS: multi-line comments /* ... */
    cleanCode = cleanCode.replace(/\/\*[\s\S]*?\*\//g, '');
    // C++, Java, JS: single line comments // ...
    cleanCode = cleanCode.replace(/\/\/.*$/gm, '');
  }

  return cleanCode;
};

export const tokenize = (code: string, language: string = 'cpp'): string[] => {
  const cleanCode = stripComments(code, language.toLowerCase());

  // Regular expression to extract tokens: strings, numbers, identifiers, symbols
  const tokenRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`|\b\d+(\.\d+)?([eE][+-]?\d+)?\b|\b[a-zA-Z_]\w*\b|[+\-*/%&|^~!=<>]=?|&&|\|\||<<|>>|\+\+|--|->|::|[{}()\[\];,.:?]/g;

  const rawTokens: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(cleanCode)) !== null) {
    rawTokens.push(match[0]);
  }

  // Identifier Normalization: map custom variable and function names to canonical VAR_1, VAR_2...
  const identifierMap = new Map<string, string>();
  let identifierCounter = 1;

  const normalizedTokens: string[] = [];

  for (const token of rawTokens) {
    const lowerToken = token.toLowerCase();

    // 1. String Literals
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      normalizedTokens.push('STR_LIT');
      continue;
    }

    // 2. Numeric Literals
    if (/^\d/.test(token)) {
      normalizedTokens.push('NUM_LIT');
      continue;
    }

    // 3. Language Keywords
    if (KEYWORDS.has(lowerToken)) {
      normalizedTokens.push(lowerToken);
      continue;
    }

    // 4. Operators and Syntactic Delimiters
    if (OPERATORS_AND_SYMBOLS.has(token)) {
      normalizedTokens.push(token);
      continue;
    }

    // 5. User-Defined Identifiers (Variables, Functions, Classes)
    if (/^[a-zA-Z_]\w*$/.test(token)) {
      if (!identifierMap.has(token)) {
        identifierMap.set(token, `VAR_${identifierCounter++}`);
      }
      normalizedTokens.push(identifierMap.get(token)!);
      continue;
    }

    normalizedTokens.push(lowerToken);
  }

  return normalizedTokens;
};
