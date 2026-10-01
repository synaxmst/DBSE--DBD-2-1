import React, { useState, useEffect, useMemo } from 'react';
import type { Problem, SupportedLanguage } from '../../types/judge';
import { parseInput } from '../../utils/codeEvaluator';
import { 
  Activity, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Terminal, 
  Maximize2, 
  Minimize2
} from 'lucide-react';

export type GeneratorType = 'array' | 'two-sum' | 'two-arrays' | 'string' | 'parentheses' | 'custom';

export interface GeneratorConfig {
  type: GeneratorType;
  count: number;
  minSize: number;
  maxSize: number;
  minValue: number;
  maxValue: number;
  allowDuplicates: boolean;
  sorted: boolean;
  stringCharset: 'lowercase' | 'alphanumeric' | 'brackets' | 'ascii';
}

export interface StressTestCase {
  id: number;
  input: string;
  bruteOutput: string;
  optimizedOutput: string;
  passed: boolean;
  bruteTimeMs: number;
  optimizedTimeMs: number;
  error?: string;
}

interface Props {
  problem: Problem;
  isOpen: boolean;
  onClose: () => void;
  activeLanguage: SupportedLanguage;
  currentWorkspaceCode: string;
  onApplyInputToConsole?: (input: string) => void;
}

/**
 * Detect best default generator type from problem tags and slug
 */
function detectGeneratorType(problem?: Problem): GeneratorType {
  if (!problem) return 'array';
  const slug = problem.slug.toLowerCase();
  const tags = (problem.tags || []).join(' ').toLowerCase();

  if (slug.includes('two-sum')) return 'two-sum';
  if (slug.includes('median') || slug.includes('two-sorted')) return 'two-arrays';
  if (slug.includes('parenthes') || tags.includes('stack')) return 'parentheses';
  if (slug.includes('substring') || slug.includes('string') || tags.includes('string')) return 'string';
  return 'array';
}

/**
 * Get default reference brute-force JavaScript implementation for a problem
 */
function getDefaultBruteForceCode(problem?: Problem): string {
  if (!problem) return '';
  const slug = problem.slug.toLowerCase();

  if (slug.includes('two-sum')) {
    return `// O(N^2) Brute Force Two Sum
function solve(input) {
  const nums = input.nums || [];
  const target = input.target || 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}`;
  }

  if (slug.includes('longest-substring')) {
    return `// O(N^3) Brute Force Longest Substring
function solve(input) {
  const s = input.s || "";
  let maxLen = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      const sub = s.slice(i, j + 1);
      const set = new Set(sub);
      if (set.size === sub.length) {
        maxLen = Math.max(maxLen, sub.length);
      }
    }
  }
  return maxLen;
}`;
  }

  if (slug.includes('median')) {
    return `// O((N+M) log(N+M)) Merge and Sort
function solve(input) {
  const nums1 = input.nums1 || [];
  const nums2 = input.nums2 || [];
  const merged = [...nums1, ...nums2].sort((a, b) => a - b);
  const n = merged.length;
  if (n === 0) return (0).toFixed(5);
  if (n % 2 === 1) return merged[Math.floor(n / 2)].toFixed(5);
  return ((merged[n / 2 - 1] + merged[n / 2]) / 2.0).toFixed(5);
}`;
  }

  if (slug.includes('trap')) {
    return `// O(N^2) Brute Force Trapping Rain Water
function solve(input) {
  const height = input.height || [];
  let water = 0;
  for (let i = 0; i < height.length; i++) {
    let leftMax = 0, rightMax = 0;
    for (let j = i; j >= 0; j--) leftMax = Math.max(leftMax, height[j]);
    for (let j = i; j < height.length; j++) rightMax = Math.max(rightMax, height[j]);
    water += Math.min(leftMax, rightMax) - height[i];
  }
  return water;
}`;
  }

  if (slug.includes('valid-parentheses')) {
    return `// O(N^2) Repeated Replacement Brute Force
function solve(input) {
  let s = input.s || "";
  let prevLen = -1;
  while (s.length > 0 && s.length !== prevLen) {
    prevLen = s.length;
    s = s.replace("()", "").replace("[]", "").replace("{}", "");
  }
  return s.length === 0;
}`;
  }

  return `// Default Brute Force solver template
function solve(input) {
  // Return expected output
  if (input.nums) return input.nums.slice().sort((a,b) => a - b);
  return input.s || input.arg0 || 0;
}`;
}

/**
 * Get default optimized JavaScript implementation for problem
 */
function getDefaultOptimizedCode(problem?: Problem): string {
  if (!problem) return '';
  const slug = problem.slug.toLowerCase();

  if (slug.includes('two-sum')) {
    return `// O(N) Hash Map Two Sum
function solve(input) {
  const nums = input.nums || [];
  const target = input.target || 0;
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;
  }

  if (slug.includes('longest-substring')) {
    return `// O(N) Sliding Window Longest Substring
function solve(input) {
  const s = input.s || "";
  const map = new Map();
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (map.has(char) && map.get(char) >= left) {
      left = map.get(char) + 1;
    }
    map.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}`;
  }

  if (slug.includes('trap')) {
    return `// O(N) Two Pointers Trapping Rain Water
function solve(input) {
  const height = input.height || [];
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}`;
  }

  if (slug.includes('valid-parentheses')) {
    return `// O(N) Stack Valid Parentheses
function solve(input) {
  const s = input.s || "";
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const c of s) {
    if (map[c]) {
      if (stack.pop() !== map[c]) return false;
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}`;
  }

  return `// Optimized solver
function solve(input) {
  return input.nums || input.s || 0;
}`;
}

export const StressTester: React.FC<Props> = ({
  problem,
  isOpen,
  onClose,
  activeLanguage,
  currentWorkspaceCode,
  onApplyInputToConsole,
}) => {
  const defaultGenType = useMemo(() => detectGeneratorType(problem), [problem]);

  const [config, setConfig] = useState<GeneratorConfig>({
    type: defaultGenType,
    count: 20,
    minSize: 3,
    maxSize: 15,
    minValue: -50,
    maxValue: 100,
    allowDuplicates: true,
    sorted: false,
    stringCharset: 'lowercase',
  });

  const [bruteForceCode, setBruteForceCode] = useState<string>(() => getDefaultBruteForceCode(problem));
  const [optimizedCode, setOptimizedCode] = useState<string>(() => getDefaultOptimizedCode(problem));
  const [useWorkspaceCode, setUseWorkspaceCode] = useState<boolean>(activeLanguage === 'javascript');
  const [activeCodeTab, setActiveCodeTab] = useState<'brute' | 'optimized'>('brute');

  const [results, setResults] = useState<StressTestCase[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<StressTestCase | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'failed' | 'passed'>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Escape key listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Sync defaults on problem change
  useEffect(() => {
    const newGen = detectGeneratorType(problem);
    setConfig(prev => ({
      ...prev,
      type: newGen,
      minValue: newGen === 'two-sum' ? -50 : 0,
      maxValue: newGen === 'two-sum' ? 100 : 50,
    }));
    setBruteForceCode(getDefaultBruteForceCode(problem));
    setOptimizedCode(getDefaultOptimizedCode(problem));
    setResults([]);
    setSelectedCase(null);
  }, [problem]);

  // Generate single test case string according to config
  const generateSingleInput = (cfg: GeneratorConfig): string => {
    const size = Math.floor(Math.random() * (cfg.maxSize - cfg.minSize + 1)) + cfg.minSize;
    const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    switch (cfg.type) {
      case 'two-sum': {
        const nums: number[] = [];
        for (let i = 0; i < size; i++) {
          nums.push(getRandomInt(cfg.minValue, cfg.maxValue));
        }
        if (cfg.sorted) nums.sort((a, b) => a - b);
        
        // Guarantee valid target at least 70% of the time by summing two random elements
        let target = 0;
        if (nums.length >= 2 && Math.random() < 0.75) {
          const idx1 = getRandomInt(0, nums.length - 2);
          const idx2 = getRandomInt(idx1 + 1, nums.length - 1);
          target = nums[idx1] + nums[idx2];
        } else {
          target = getRandomInt(cfg.minValue * 2, cfg.maxValue * 2);
        }
        return `nums = [${nums.join(', ')}], target = ${target}`;
      }

      case 'two-arrays': {
        const s1 = Math.floor(size / 2) || 1;
        const s2 = (size - s1) || 1;
        const arr1: number[] = [];
        const arr2: number[] = [];
        for (let i = 0; i < s1; i++) arr1.push(getRandomInt(cfg.minValue, cfg.maxValue));
        for (let i = 0; i < s2; i++) arr2.push(getRandomInt(cfg.minValue, cfg.maxValue));
        arr1.sort((a, b) => a - b);
        arr2.sort((a, b) => a - b);
        return `nums1 = [${arr1.join(', ')}], nums2 = [${arr2.join(', ')}]`;
      }

      case 'string': {
        const chars = cfg.stringCharset === 'lowercase' 
          ? 'abcdefghijklmnopqrstuvwxyz' 
          : cfg.stringCharset === 'alphanumeric'
          ? 'abcdefghijklmnopqrstuvwxyz0123456789'
          : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
        let str = '';
        for (let i = 0; i < size; i++) {
          str += chars[getRandomInt(0, chars.length - 1)];
        }
        return `s = "${str}"`;
      }

      case 'parentheses': {
        const pairs = ['()', '[]', '{}'];
        const chars = ['(', ')', '[', ']', '{', '}'];
        let str = '';
        // 50% chance valid balanced string, 50% random
        if (Math.random() < 0.5) {
          let curr = '';
          const numPairs = Math.max(1, Math.floor(size / 2));
          for (let i = 0; i < numPairs; i++) {
            const p = pairs[getRandomInt(0, pairs.length - 1)];
            if (curr.length === 0 || Math.random() < 0.5) {
              curr = p[0] + curr + p[1];
            } else {
              curr += p;
            }
          }
          str = curr;
        } else {
          for (let i = 0; i < size; i++) {
            str += chars[getRandomInt(0, chars.length - 1)];
          }
        }
        return `s = "${str}"`;
      }

      case 'array':
      default: {
        const arr: number[] = [];
        for (let i = 0; i < size; i++) {
          arr.push(getRandomInt(Math.max(0, cfg.minValue), cfg.maxValue));
        }
        if (cfg.sorted) arr.sort((a, b) => a - b);
        const slug = problem.slug.toLowerCase();
        if (slug.includes('trap')) {
          return `height = [${arr.join(', ')}]`;
        }
        return `nums = [${arr.join(', ')}]`;
      }
    }
  };

  // Safe executor for runner scripts
  const executeUserScript = (codeStr: string, parsedData: Record<string, any>): { output: string; timeMs: number; error?: string } => {
    const t0 = performance.now();
    try {
      const wrapped = `
        "use strict";
        ${codeStr}
        if (typeof solve === 'function') {
          return solve(arguments[0]);
        }
        if (typeof twoSum === 'function') {
          return twoSum(arguments[0].nums, arguments[0].target);
        }
        if (typeof lengthOfLongestSubstring === 'function') {
          return lengthOfLongestSubstring(arguments[0].s);
        }
        if (typeof trap === 'function') {
          return trap(arguments[0].height || arguments[0].nums);
        }
        if (typeof isValid === 'function') {
          return isValid(arguments[0].s);
        }
        if (typeof findMedianSortedArrays === 'function') {
          return findMedianSortedArrays(arguments[0].nums1, arguments[0].nums2);
        }
        return solve(arguments[0]);
      `;
      const fn = new Function(wrapped);
      const res = fn(parsedData);
      const t1 = performance.now();
      
      let formatted = '';
      if (res === undefined) formatted = 'undefined';
      else if (typeof res === 'object') formatted = JSON.stringify(res);
      else formatted = String(res);

      return {
        output: formatted,
        timeMs: Math.max(0.01, +(t1 - t0).toFixed(2)),
      };
    } catch (err: any) {
      const t1 = performance.now();
      return {
        output: '',
        timeMs: +(t1 - t0).toFixed(2),
        error: err.message || 'Execution error',
      };
    }
  };

  // Run full stress test cycle
  const handleRunStressTest = () => {
    setIsRunning(true);
    setResults([]);
    setSelectedCase(null);

    // Use setTimeout so UI updates with spinner immediately
    setTimeout(() => {
      const cases: StressTestCase[] = [];
      const testCount = Math.min(100, Math.max(1, config.count));

      const optCodeToRun = (useWorkspaceCode && activeLanguage === 'javascript') 
        ? currentWorkspaceCode 
        : optimizedCode;

      for (let i = 1; i <= testCount; i++) {
        const inputStr = generateSingleInput(config);
        const parsed = parseInput(inputStr);

        const bruteRes = executeUserScript(bruteForceCode, parsed);
        const optRes = executeUserScript(optCodeToRun, parsed);

        // Normalize outputs for comparison
        const normBrute = bruteRes.output.replace(/\s+/g, '');
        const normOpt = optRes.output.replace(/\s+/g, '');

        let isMatch = false;
        if (!bruteRes.error && !optRes.error) {
          // Check array permutation equivalence for Two Sum
          if (config.type === 'two-sum' && normBrute.startsWith('[') && normOpt.startsWith('[')) {
            try {
              const bArr = JSON.parse(bruteRes.output);
              const oArr = JSON.parse(optRes.output);
              if (Array.isArray(bArr) && Array.isArray(oArr)) {
                if (bArr.length === oArr.length) {
                  if (bArr.length === 0 && oArr.length === 0) isMatch = true;
                  else if (bArr.slice().sort().join(',') === oArr.slice().sort().join(',')) isMatch = true;
                }
              }
            } catch {
              isMatch = normBrute === normOpt;
            }
          } else {
            isMatch = normBrute === normOpt;
          }
        }

        cases.push({
          id: i,
          input: inputStr,
          bruteOutput: bruteRes.error ? `Error: ${bruteRes.error}` : bruteRes.output,
          optimizedOutput: optRes.error ? `Error: ${optRes.error}` : optRes.output,
          passed: isMatch,
          bruteTimeMs: bruteRes.timeMs,
          optimizedTimeMs: optRes.timeMs,
          error: optRes.error || bruteRes.error,
        });
      }

      setResults(cases);
      setIsRunning(false);

      // Auto-select first failed case if any, else select case #1
      const firstFail = cases.find(c => !c.passed);
      setSelectedCase(firstFail || cases[0] || null);
    }, 100);
  };

  // Stats calculations
  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const totalBruteTime = results.reduce((acc, c) => acc + c.bruteTimeMs, 0);
    const totalOptTime = results.reduce((acc, c) => acc + c.optimizedTimeMs, 0);
    const speedup = totalOptTime > 0 ? (totalBruteTime / totalOptTime).toFixed(1) : '1.0';

    return {
      total: results.length,
      passed,
      failed,
      passRate: ((passed / results.length) * 100).toFixed(0),
      totalBruteTime: totalBruteTime.toFixed(2),
      totalOptTime: totalOptTime.toFixed(2),
      speedup,
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (filterMode === 'failed') return results.filter(r => !r.passed);
    if (filterMode === 'passed') return results.filter(r => r.passed);
    return results;
  }, [results, filterMode]);

  const handleCopyInput = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--obsidian)]/80 backdrop-blur-sm p-2 sm:p-4 font-sans page-fade">
      <div 
        className={`w-full ${isExpanded ? 'max-w-7xl h-[94vh]' : 'max-w-5xl h-[86vh]'} flex flex-col rounded-[var(--r-lg)] bg-[var(--obsidian)] border border-[var(--border-strong)] shadow-[var(--shadow-lg)] overflow-hidden transition-all duration-200`}
      >
        {/* Header Bar */}
        <div className="h-12 border-b border-[var(--border)] bg-[var(--carbon)] px-4 flex items-center justify-between shrink-0 font-mono text-xs select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--verdigris)]">
              <Activity className="w-4 h-4 text-[var(--verdigris)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[var(--bone)] text-sm tracking-tight font-sans">
                  Dual-Engine Stress Tester
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)] text-[10px] text-[var(--verdigris)]">
                  Differential Fuzzing
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-3)] font-sans hidden sm:block">
                Auto-generate random corner cases to catch tricky bugs between Naive & Optimized solutions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded hover:bg-[var(--ash)] text-[var(--text-3)] hover:text-[var(--bone)] transition-colors cursor-pointer"
              title={isExpanded ? 'Restore window size' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--red-dim)] hover:text-[var(--red)] text-[var(--text-3)] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body (Split into Left: Config & Code, Right: Live Results) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[var(--obsidian)]">
          
          {/* Left Column: Generator Controls & Algorithm Editors */}
          <div className="w-full lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--carbon)] flex flex-col overflow-hidden">
            
            {/* Generator Settings Header */}
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--carbon)] shrink-0 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--bone)] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sliders className="w-3.5 h-3.5 text-[var(--verdigris)]" />
                  Input Generator Config
                </span>
                <span className="text-[10px] text-[var(--text-3)]">
                  Target: <strong className="text-[var(--bone)]">{problem.title}</strong>
                </span>
              </div>

              {/* Generator Type Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'two-sum', label: 'Two Sum' },
                  { id: 'array', label: '1D Array' },
                  { id: 'two-arrays', label: '2 Arrays' },
                  { id: 'string', label: 'String' },
                  { id: 'parentheses', label: 'Brackets' },
                  { id: 'custom', label: 'Custom' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setConfig(prev => ({ ...prev, type: item.id as GeneratorType }))}
                    className={`py-1.5 px-2 rounded text-[11px] font-mono border transition-all text-center cursor-pointer ${
                      config.type === item.id
                        ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border-[var(--verdigris)] font-semibold'
                        : 'bg-[var(--ash)] text-[var(--text-3)] border-[var(--border)] hover:text-[var(--bone)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Constraint Sliders & Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-[var(--text-3)] block mb-1">Number of Cases (N)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={config.count}
                    onChange={e => setConfig(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-[var(--ash)] text-[var(--bone)] px-2.5 py-1 rounded text-xs border border-[var(--border)] focus:border-[var(--verdigris)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-3)] block mb-1">Size Range (Min..Max)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={config.minSize}
                      onChange={e => setConfig(prev => ({ ...prev, minSize: parseInt(e.target.value) || 1 }))}
                      className="w-1/2 bg-[var(--ash)] text-[var(--bone)] px-2 py-1 rounded text-xs border border-[var(--border)] text-center"
                    />
                    <span className="text-[var(--text-3)]">-</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={config.maxSize}
                      onChange={e => setConfig(prev => ({ ...prev, maxSize: parseInt(e.target.value) || 10 }))}
                      className="w-1/2 bg-[var(--ash)] text-[var(--bone)] px-2 py-1 rounded text-xs border border-[var(--border)] text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-3)] block mb-1">Min Value</label>
                  <input
                    type="number"
                    value={config.minValue}
                    onChange={e => setConfig(prev => ({ ...prev, minValue: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[var(--ash)] text-[var(--bone)] px-2.5 py-1 rounded text-xs border border-[var(--border)]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-3)] block mb-1">Max Value</label>
                  <input
                    type="number"
                    value={config.maxValue}
                    onChange={e => setConfig(prev => ({ ...prev, maxValue: parseInt(e.target.value) || 100 }))}
                    className="w-full bg-[var(--ash)] text-[var(--bone)] px-2.5 py-1 rounded text-xs border border-[var(--border)]"
                  />
                </div>
              </div>

              {/* Extra toggles */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-3)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sorted}
                    onChange={e => setConfig(prev => ({ ...prev, sorted: e.target.checked }))}
                    className="rounded bg-[var(--ash)] border-[var(--border)] accent-[var(--verdigris)]"
                  />
                  <span>Force Sorted</span>
                </label>

                {activeLanguage === 'javascript' && (
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Use current workspace code as the optimized engine">
                    <input
                      type="checkbox"
                      checked={useWorkspaceCode}
                      onChange={e => setUseWorkspaceCode(e.target.checked)}
                      className="rounded bg-[var(--ash)] border-[var(--border)] accent-[var(--verdigris)]"
                    />
                    <span className="text-[var(--verdigris)]">Use Workspace Code</span>
                  </label>
                )}
              </div>
            </div>

            {/* Code Tabs Header (Brute Force vs Optimized) */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--carbon)] px-3 py-2 shrink-0 font-mono text-xs">
              <div className="flex items-center gap-1 bg-[var(--ash)] p-0.5 rounded border border-[var(--border)]">
                <button
                  onClick={() => setActiveCodeTab('brute')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activeCodeTab === 'brute' 
                      ? 'bg-[var(--carbon)] text-[var(--amber)] font-bold shadow-sm' 
                      : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                  }`}
                >
                  1. Brute Force Code
                </button>
                <button
                  onClick={() => setActiveCodeTab('optimized')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activeCodeTab === 'optimized' 
                      ? 'bg-[var(--carbon)] text-[var(--verdigris)] font-bold shadow-sm' 
                      : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                  }`}
                >
                  2. Optimized Code
                </button>
              </div>

              <button
                onClick={() => {
                  setBruteForceCode(getDefaultBruteForceCode(problem));
                  setOptimizedCode(getDefaultOptimizedCode(problem));
                }}
                className="text-[10px] text-[var(--text-3)] hover:text-[var(--bone)] flex items-center gap-1 cursor-pointer"
                title="Reset solver templates to defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Code Editor Area */}
            <div className="flex-1 min-h-[160px] flex flex-col p-2 bg-[var(--obsidian)] overflow-hidden">
              <textarea
                value={activeCodeTab === 'brute' ? bruteForceCode : (useWorkspaceCode && activeLanguage === 'javascript' ? currentWorkspaceCode : optimizedCode)}
                onChange={e => {
                  if (activeCodeTab === 'brute') {
                    setBruteForceCode(e.target.value);
                  } else {
                    setOptimizedCode(e.target.value);
                  }
                }}
                disabled={activeCodeTab === 'optimized' && useWorkspaceCode && activeLanguage === 'javascript'}
                placeholder="Write JavaScript solver function solve(input) { ... }"
                className="w-full h-full p-2.5 rounded bg-[var(--carbon)] text-[var(--bone)] font-mono text-xs border border-[var(--border)] focus:border-[var(--verdigris)] focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Run Button Action Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--carbon)] shrink-0">
              <button
                onClick={handleRunStressTest}
                disabled={isRunning}
                className="btn-primary w-full justify-center gap-2 !py-2.5 !text-xs font-mono font-bold tracking-wide shadow-[var(--shadow-md)]"
              >
                {isRunning ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[var(--obsidian)] border-t-transparent rounded-full animate-spin" />
                    <span>Fuzzing & Executing {config.count} Test Cases...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Generate & Run Stress Test ({config.count} Cases)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Results, Counterexamples & Diff Panel */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--obsidian)]">
            
            {/* Top Stat Summary Banner */}
            {stats && (
              <div className="p-4 border-b border-[var(--border)] bg-[var(--carbon)] flex flex-wrap items-center justify-between gap-4 font-mono text-xs shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {stats.failed === 0 ? (
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--verdigris)]/40 flex items-center justify-center text-[var(--verdigris)]">
                        <CheckCircle2 className="w-4 h-4 text-[var(--verdigris)]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--red-dim)] border border-[var(--red)]/40 flex items-center justify-center text-[var(--red)]">
                        <AlertTriangle className="w-4 h-4 text-[var(--red)]" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-[var(--bone)]">
                        {stats.failed === 0 ? 'All Test Cases Passed!' : `${stats.failed} Discrepancy Found!`}
                      </div>
                      <div className="text-[11px] text-[var(--text-3)] font-sans">
                        {stats.passed} / {stats.total} passed ({stats.passRate}% reliability)
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-[var(--border)] text-[11px]">
                    <div>
                      <span className="text-[var(--text-3)]">Brute Force:</span>
                      <strong className="text-[var(--amber)] ml-1">{stats.totalBruteTime}ms</strong>
                    </div>
                    <div>
                      <span className="text-[var(--text-3)]">Optimized:</span>
                      <strong className="text-[var(--verdigris)] ml-1">{stats.totalOptTime}ms</strong>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)] text-[var(--bone)] font-bold">
                      {stats.speedup}x Faster
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-[var(--ash)] p-0.5 rounded border border-[var(--border)]">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMode === 'all' ? 'bg-[var(--carbon)] text-[var(--bone)]' : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setFilterMode('failed')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMode === 'failed' ? 'bg-[var(--red-dim)] text-[var(--red)] font-bold' : 'text-[var(--text-3)] hover:text-[var(--red)]'
                    }`}
                  >
                    Failed ({stats.failed})
                  </button>
                  <button
                    onClick={() => setFilterMode('passed')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMode === 'passed' ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] font-bold' : 'text-[var(--text-3)] hover:text-[var(--verdigris)]'
                    }`}
                  >
                    Passed ({stats.passed})
                  </button>
                </div>
              </div>
            )}

            {/* Results Body: Table + Inspector */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              
              {/* Test Cases Table */}
              <div className="flex-1 min-h-0 overflow-y-auto border-r border-[var(--border)]">
                {results.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 font-sans">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--ash)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)]">
                      <Activity className="w-6 h-6 text-[var(--verdigris)]" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <div className="text-sm font-semibold text-[var(--bone)]">Ready to Stress Test</div>
                      <p className="text-xs text-[var(--text-3)]">
                        Click "Generate & Run Stress Test" to execute random inputs through both solvers and compare outputs in real-time.
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead className="sticky top-0 bg-[var(--carbon)] border-b border-[var(--border)] text-[10px] text-[var(--text-3)] uppercase tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Generated Input</th>
                        <th className="py-2.5 px-3">Brute Output</th>
                        <th className="py-2.5 px-3">Optimized Output</th>
                        <th className="py-2.5 px-3 text-right">Time Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredResults.map(tc => {
                        const isSelected = selectedCase?.id === tc.id;
                        return (
                          <tr
                            key={tc.id}
                            onClick={() => setSelectedCase(tc)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--ash)] border-l-2 border-l-[var(--verdigris)]'
                                : tc.passed
                                ? 'hover:bg-[var(--ash)]/50'
                                : 'bg-[var(--red-dim)]/20 hover:bg-[var(--red-dim)]/40'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-[var(--text-3)]">
                              #{tc.id}
                            </td>
                            <td className="py-2 px-3">
                              {tc.passed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--verdigris)] font-bold">
                                  <Check className="w-3 h-3" /> PASS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--red-dim)] text-[var(--red)] font-bold">
                                  <X className="w-3 h-3" /> MISMATCH
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[var(--bone)] max-w-[180px] truncate" title={tc.input}>
                              {tc.input}
                            </td>
                            <td className="py-2 px-3 text-[var(--amber)] max-w-[120px] truncate" title={tc.bruteOutput}>
                              {tc.bruteOutput}
                            </td>
                            <td className="py-2 px-3 text-[var(--verdigris)] max-w-[120px] truncate" title={tc.optimizedOutput}>
                              {tc.optimizedOutput}
                            </td>
                            <td className="py-2 px-3 text-right text-[var(--text-3)] text-[11px]">
                              {tc.optimizedTimeMs}ms
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Inspector Pane (Selected Test Case Detail) */}
              <div className="w-full md:w-[360px] shrink-0 bg-[var(--carbon)] flex flex-col overflow-y-auto p-4 space-y-4 font-mono text-xs">
                {selectedCase ? (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--bone)]">
                          Case #{selectedCase.id}
                        </span>
                        {selectedCase.passed ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--verdigris)] font-bold">
                            PASSED
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--red-dim)] text-[var(--red)] font-bold">
                            FAILED (MISMATCH)
                          </span>
                        )}
                      </div>

                      {onApplyInputToConsole && (
                        <button
                          onClick={() => {
                            onApplyInputToConsole(selectedCase.input);
                            onClose();
                          }}
                          className="text-[11px] text-[var(--verdigris)] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Copy input to Console Runner stdin and switch to workspace"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Send to Console</span>
                        </button>
                      )}
                    </div>

                    {/* Input View with Copy */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-3)]">
                        <span>Generated Input:</span>
                        <button
                          onClick={() => handleCopyInput(selectedCase.input, selectedCase.id)}
                          className="hover:text-[var(--bone)] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedId === selectedCase.id ? (
                            <>
                              <Check className="w-3 h-3 text-[var(--verdigris)]" />
                              <span className="text-[var(--verdigris)]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 rounded bg-[var(--obsidian)] text-[var(--bone)] border border-[var(--border)] whitespace-pre-wrap break-all leading-relaxed max-h-36 overflow-y-auto">
                        {selectedCase.input}
                      </pre>
                    </div>

                    {/* Outputs Comparison Box */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[var(--amber)]">
                          <span>Brute Force Output:</span>
                          <span className="text-[10px] text-[var(--text-3)]">{selectedCase.bruteTimeMs}ms</span>
                        </div>
                        <pre className="p-2.5 rounded bg-[var(--obsidian)] text-[var(--amber)] border border-[var(--border)] whitespace-pre-wrap break-all">
                          {selectedCase.bruteOutput || '(Empty)'}
                        </pre>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[var(--verdigris)]">
                          <span>Optimized Output:</span>
                          <span className="text-[10px] text-[var(--text-3)]">{selectedCase.optimizedTimeMs}ms</span>
                        </div>
                        <pre className={`p-2.5 rounded bg-[var(--obsidian)] border whitespace-pre-wrap break-all ${
                          selectedCase.passed 
                            ? 'text-[var(--verdigris)] border-[var(--verdigris)]/40' 
                            : 'text-[var(--red)] border-[var(--red)]/50 font-bold'
                        }`}>
                          {selectedCase.optimizedOutput || '(Empty)'}
                        </pre>
                      </div>
                    </div>

                    {/* Difference alert if mismatch */}
                    {!selectedCase.passed && (
                      <div className="p-3 rounded bg-[var(--red-dim)] border border-[var(--red)]/40 space-y-1 text-[11px] font-sans">
                        <div className="font-bold text-[var(--red)] flex items-center gap-1.5 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Counterexample Detected</span>
                        </div>
                        <p className="text-[var(--red)]/90 leading-relaxed">
                          Your optimized solution returned a different result than the reference brute force algorithm on this input. Send this testcase to the Console Runner to step through the failure.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-[var(--text-3)] text-xs font-sans">
                    Select any test case row to inspect full input data and output diff.
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
