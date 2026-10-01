import type { Problem, SupportedLanguage, TestCaseResult } from '../types/judge';

/**
 * Universal Input Parser
 * Parses diverse input formats including:
 * 1. LeetCode format: `nums = [2, 7, 11, 15], target = 9` or `nums1 = [1, 3], nums2 = [2]`
 * 2. CP stdin format: `2 1 3 1 2` or `4\n2 7 11 15\n9`
 * 3. JSON arrays/objects: `[1, 2, 3]` or `["LRUCache", "put"]\n[[2], [1, 1]]`
 * 4. Plain strings: `"abcabcbb"` or `()[]{}`
 */
export function parseInput(rawInput: string): Record<string, any> {
  const trimmed = rawInput.trim();
  const result: Record<string, any> = {};

  if (!trimmed) return result;

  // 1. Check for multiline JSON calls (e.g. LRU Cache)
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 2 && lines[0].startsWith('[') && lines[1].startsWith('[')) {
    try {
      result.operations = JSON.parse(lines[0]);
      result.operationArgs = JSON.parse(lines[1]);
      return result;
    } catch {
      // Fall through to other parsers
    }
  }

  // 2. Check for named parameter format: `key = value, key2 = value2`
  if (trimmed.includes('=')) {
    const regex = /([a-zA-Z0-9_]+)\s*=\s*(\[[^\]]*\]|"[^"]*"|'[^']*'|-?\d+(?:\.\d+)?|true|false|null)/g;
    let match: RegExpExecArray | null;
    let foundMatches = false;

    while ((match = regex.exec(trimmed)) !== null) {
      foundMatches = true;
      const key = match[1];
      const valStr = match[2];
      try {
        result[key] = JSON.parse(valStr);
      } catch {
        result[key] = valStr.replace(/^["']|["']$/g, '');
      }
    }

    if (foundMatches && Object.keys(result).length > 0) {
      return result;
    }
  }

  // 3. Check for single JSON structure: Array or Object
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      result.arg0 = parsed;
      return result;
    } catch {
      // Fall through
    }
  }

  // 4. Check for space/newline-separated numbers (CP Stdin format: e.g. "2 1 3 1 2" or "4 2 7 11 15 9")
  const tokens = trimmed.split(/\s+/).map(t => t.trim()).filter(Boolean);
  const allNumbers = tokens.every(t => !isNaN(Number(t)));

  if (allNumbers && tokens.length > 0) {
    result._rawNumbers = tokens.map(Number);
    return result;
  }

  // 5. Raw string fallback
  result.s = trimmed.replace(/^["']|["']$/g, '');
  return result;
}

/**
 * Execute code using JavaScript runtime if user chose JS
 */
function tryRunJavaScript(code: string, parsedInput: Record<string, any>): { success: boolean; result?: any; stdout?: string; error?: string } {
  try {
    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args: any[]) => logs.push(`[warn] ${args.join(' ')}`),
      error: (...args: any[]) => logs.push(`[error] ${args.join(' ')}`),
    };

    const wrappedCode = `
      "use strict";
      const console = arguments[0];
      ${code}
      
      if (typeof twoSum === 'function') return twoSum(arguments[1], arguments[2]);
      if (typeof findMedianSortedArrays === 'function') return findMedianSortedArrays(arguments[1], arguments[2]);
      if (typeof lengthOfLongestSubstring === 'function') return lengthOfLongestSubstring(arguments[1]);
      if (typeof trap === 'function') return trap(arguments[1]);
      if (typeof isValid === 'function') return isValid(arguments[1]);
      if (typeof addTwoNumbers === 'function') return addTwoNumbers(arguments[1], arguments[2]);
      if (typeof canFinish === 'function') return canFinish(arguments[1], arguments[2]);
      return undefined;
    `;

    const fn = new Function(wrappedCode);
    const args = Object.values(parsedInput);
    const ret = fn(customConsole, args[0], args[1], args[2]);

    return {
      success: true,
      result: ret,
      stdout: logs.length > 0 ? logs.join('\n') : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Runtime Error: ${err.message}`,
    };
  }
}

/**
 * Client-side Evaluation Entry Point for Local Validation
 */
export function evaluateCode(
  problem: Problem,
  language: SupportedLanguage,
  code: string,
  rawInput: string,
  expectedOutput?: string
): TestCaseResult {
  const trimmedCode = code.trim();
  const startTime = typeof performance !== 'undefined' ? performance.now() : 0;

  // 1. Check for empty code or basic syntax cues
  if (!trimmedCode) {
    return {
      testCaseId: `tc-${Date.now()}`,
      input: rawInput,
      expectedOutput: expectedOutput || '',
      actualOutput: '',
      passed: false,
      executionTimeMs: 0,
      memoryKb: 0,
      stdout: '',
      error: 'Cannot evaluate empty solution code.',
    };
  }

  // 2. Parse raw input
  const parsed = parseInput(rawInput);
  let computedOutput: string = '';
  let customStdout: string | undefined = undefined;
  let customError: string | undefined = undefined;

  // 3. If JavaScript, attempt live evaluation
  if (language === 'javascript') {
    const jsExec = tryRunJavaScript(code, parsed);
    if (jsExec.success && jsExec.result !== undefined) {
      if (typeof jsExec.result === 'object') {
        computedOutput = JSON.stringify(jsExec.result);
      } else if (typeof jsExec.result === 'number' && problem.slug.includes('median')) {
        computedOutput = jsExec.result.toFixed(5);
      } else {
        computedOutput = String(jsExec.result);
      }
      customStdout = jsExec.stdout;
    } else if (!jsExec.success) {
      customError = jsExec.error;
    }
  } else {
    // Non-JS languages cannot be interpreted in the browser
    customError = `Direct in-browser execution is only supported for JavaScript. Submit your ${language.toUpperCase()} code to run against the judge backend.`;
  }

  const executionTimeMs = startTime > 0 ? Math.max(1, Math.round(performance.now() - startTime)) : 1;
  const memoryKb = 0;

  // Normalize outputs for comparison
  const normalize = (s: string) => s.replace(/\s+/g, '').replace(/\[null/g, '[null').trim();
  const isCustomInput = !expectedOutput || expectedOutput === '(Custom input evaluation)';
  const passed = !customError && (isCustomInput ? true : normalize(computedOutput) === normalize(expectedOutput));

  const stdoutHeader = `[stdout] Language runtime: ${language.toUpperCase()}\n[stdout] Output returned: ${computedOutput || '(no output)'}`;
  const stdout = customStdout ? `${stdoutHeader}\n[debug] ${customStdout}` : stdoutHeader;

  return {
    testCaseId: `tc-${Date.now()}`,
    input: rawInput,
    expectedOutput: expectedOutput || '(Custom input evaluation)',
    actualOutput: customError ? '' : computedOutput,
    passed,
    executionTimeMs,
    memoryKb,
    stdout: customError ? '' : stdout,
    error: customError,
  };
}
