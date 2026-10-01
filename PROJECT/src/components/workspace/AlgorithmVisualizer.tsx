import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Problem } from '../../types/judge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  PlaySquare, 
  Layers
} from 'lucide-react';

export type AlgorithmPattern = 
  | 'array-traversal' 
  | 'two-pointers' 
  | 'sliding-window' 
  | 'stack-queue' 
  | 'binary-search';

interface VisualStep {
  stepIndex: number;
  title: string;
  description: string;
  codeLine: string;
  // Visual state data
  array?: (number | string)[];
  activeIndices?: number[];
  pointers?: Record<string, { index: number; label: string; color: string }>;
  windowRange?: [number, number];
  stack?: (string | number)[];
  queue?: (string | number)[];
  variables?: Record<string, string | number | boolean>;
  dimmedIndices?: number[];
  foundIndex?: number;
}

interface Props {
  problem: Problem;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Automatically determine the algorithmic pattern from problem tags and title
 */
export function detectPatternFromProblem(problem?: Problem): AlgorithmPattern {
  if (!problem) return 'array-traversal';
  const combined = [...(problem.tags || []), problem.title, problem.description || ''].join(' ').toLowerCase();

  if (combined.includes('binary search') || combined.includes('search a 2d') || combined.includes('bisect') || combined.includes('find minimum in rotated')) {
    return 'binary-search';
  }
  if (combined.includes('sliding window') || combined.includes('substring') || combined.includes('longest substring') || combined.includes('minimum window')) {
    return 'sliding-window';
  }
  if (combined.includes('two pointer') || combined.includes('two-pointer') || combined.includes('two sum') || combined.includes('3sum') || combined.includes('container with most water') || combined.includes('trapping rain')) {
    return 'two-pointers';
  }
  if (combined.includes('stack') || combined.includes('queue') || combined.includes('parentheses') || combined.includes('lru') || combined.includes('monotonic')) {
    return 'stack-queue';
  }
  return 'array-traversal';
}

/**
 * Step generator for Array Traversal
 */
function generateArrayTraversalSteps(): VisualStep[] {
  const arr = [2, 7, 11, 15, 8, 4];
  const target = 15;
  const steps: VisualStep[] = [
    {
      stepIndex: 0,
      title: 'Initialize Pointer & Accumulator',
      description: `Starting linear array traversal. Looking for target value ${target} or maximum element.`,
      codeLine: 'int maxVal = arr[0]; int target = 15;',
      array: arr,
      activeIndices: [0],
      pointers: { i: { index: 0, label: 'i (current)', color: 'var(--verdigris)' } },
      variables: { i: 0, 'arr[0]': 2, maxVal: 2, target: 15 },
    },
    {
      stepIndex: 1,
      title: 'Inspect Index 1',
      description: 'Moving pointer to index 1. arr[1] = 7 is greater than current maxVal (2). Update maxVal = 7.',
      codeLine: 'if (arr[i] > maxVal) maxVal = arr[i];',
      array: arr,
      activeIndices: [1],
      pointers: { i: { index: 1, label: 'i = 1', color: 'var(--verdigris)' } },
      variables: { i: 1, 'arr[1]': 7, maxVal: 7, target: 15 },
    },
    {
      stepIndex: 2,
      title: 'Inspect Index 2',
      description: 'Moving pointer to index 2. arr[2] = 11 is greater than current maxVal (7). Update maxVal = 11.',
      codeLine: 'if (arr[i] > maxVal) maxVal = arr[i];',
      array: arr,
      activeIndices: [2],
      pointers: { i: { index: 2, label: 'i = 2', color: 'var(--verdigris)' } },
      variables: { i: 2, 'arr[2]': 11, maxVal: 11, target: 15 },
    },
    {
      stepIndex: 3,
      title: 'Inspect Index 3 — Target Match!',
      description: `Pointer at index 3 matches target ${target}! arr[3] = 15. Update maxVal = 15.`,
      codeLine: 'if (arr[i] == target) return i; // Target Found',
      array: arr,
      activeIndices: [3],
      foundIndex: 3,
      pointers: { i: { index: 3, label: 'MATCH ✓', color: 'var(--green)' } },
      variables: { i: 3, 'arr[3]': 15, maxVal: 15, found: true },
    },
    {
      stepIndex: 4,
      title: 'Inspect Index 4',
      description: 'Pointer at index 4. arr[4] = 8 is smaller than maxVal (15). No update.',
      codeLine: 'i++; // continue scan',
      array: arr,
      activeIndices: [4],
      pointers: { i: { index: 4, label: 'i = 4', color: 'var(--verdigris)' } },
      variables: { i: 4, 'arr[4]': 8, maxVal: 15, found: true },
    },
    {
      stepIndex: 5,
      title: 'Traversal Complete',
      description: 'Reached end of array. Successfully scanned all N elements in linear O(N) time.',
      codeLine: 'return maxVal; // Algorithm Complete',
      array: arr,
      activeIndices: [3],
      foundIndex: 3,
      pointers: { i: { index: 5, label: 'end', color: 'var(--text-3)' } },
      variables: { totalScanned: 6, maxVal: 15, timeComplexity: 'O(N)' },
    },
  ];
  return steps;
}

/**
 * Step generator for Two Pointer Technique
 */
function generateTwoPointerSteps(): VisualStep[] {
  const arr = [1, 2, 4, 7, 11, 15, 18];
  const target = 15;

  return [
    {
      stepIndex: 0,
      title: 'Initialize Left and Right Pointers',
      description: `Sorted array with target sum = ${target}. Left pointer at 0 (1), Right pointer at 6 (18).`,
      codeLine: 'int left = 0, right = n - 1;',
      array: arr,
      activeIndices: [0, 6],
      pointers: {
        left: { index: 0, label: 'L (1)', color: 'var(--verdigris)' },
        right: { index: 6, label: 'R (18)', color: 'var(--amber)' },
      },
      variables: { left: 0, right: 6, 'arr[L]': 1, 'arr[R]': 18, currentSum: 19, target: 15 },
    },
    {
      stepIndex: 1,
      title: 'Sum (19) > Target (15) -> Decrement Right',
      description: '1 + 18 = 19 is too large. Since array is sorted, decrease sum by moving right pointer inward (right--).',
      codeLine: 'if (sum > target) right--;',
      array: arr,
      activeIndices: [0, 5],
      dimmedIndices: [6],
      pointers: {
        left: { index: 0, label: 'L (1)', color: 'var(--verdigris)' },
        right: { index: 5, label: 'R (15)', color: 'var(--amber)' },
      },
      variables: { left: 0, right: 5, 'arr[L]': 1, 'arr[R]': 15, currentSum: 16, target: 15 },
    },
    {
      stepIndex: 2,
      title: 'Sum (16) > Target (15) -> Decrement Right',
      description: '1 + 15 = 16 is still greater than 15. Decrement right pointer again (right--).',
      codeLine: 'if (sum > target) right--;',
      array: arr,
      activeIndices: [0, 4],
      dimmedIndices: [5, 6],
      pointers: {
        left: { index: 0, label: 'L (1)', color: 'var(--verdigris)' },
        right: { index: 4, label: 'R (11)', color: 'var(--amber)' },
      },
      variables: { left: 0, right: 4, 'arr[L]': 1, 'arr[R]': 11, currentSum: 12, target: 15 },
    },
    {
      stepIndex: 3,
      title: 'Sum (12) < Target (15) -> Increment Left',
      description: '1 + 11 = 12 is smaller than target. To increase sum, advance left pointer (left++).',
      codeLine: 'else if (sum < target) left++;',
      array: arr,
      activeIndices: [1, 4],
      dimmedIndices: [0, 5, 6],
      pointers: {
        left: { index: 1, label: 'L (2)', color: 'var(--verdigris)' },
        right: { index: 4, label: 'R (11)', color: 'var(--amber)' },
      },
      variables: { left: 1, right: 4, 'arr[L]': 2, 'arr[R]': 11, currentSum: 13, target: 15 },
    },
    {
      stepIndex: 4,
      title: 'Sum (13) < Target (15) -> Increment Left',
      description: '2 + 11 = 13 is still less than 15. Advance left pointer to index 2 (left++).',
      codeLine: 'else if (sum < target) left++;',
      array: arr,
      activeIndices: [2, 4],
      dimmedIndices: [0, 1, 5, 6],
      pointers: {
        left: { index: 2, label: 'L (4)', color: 'var(--verdigris)' },
        right: { index: 4, label: 'R (11)', color: 'var(--amber)' },
      },
      variables: { left: 2, right: 4, 'arr[L]': 4, 'arr[R]': 11, currentSum: 15, target: 15 },
    },
    {
      stepIndex: 5,
      title: 'Target Pair Found: arr[2] + arr[4] = 15',
      description: '4 + 11 == 15! Exact target pair identified at indices [2, 4] with zero extra space overhead.',
      codeLine: 'return {left, right}; // Solution Found',
      array: arr,
      activeIndices: [2, 4],
      foundIndex: 2,
      pointers: {
        left: { index: 2, label: 'MATCH [2]', color: 'var(--green)' },
        right: { index: 4, label: 'MATCH [4]', color: 'var(--green)' },
      },
      variables: { result: '[2, 4]', finalSum: 15, spaceComplexity: 'O(1)' },
    },
  ];
}

/**
 * Step generator for Sliding Window
 */
function generateSlidingWindowSteps(problem?: Problem): VisualStep[] {
  const isStringProblem = problem && (
    problem.slug.toLowerCase().includes('substring') || 
    problem.slug.toLowerCase().includes('string') ||
    (problem.tags || []).some(t => t.toLowerCase().includes('string'))
  );

  if (isStringProblem) {
    const chars = ['a', 'b', 'c', 'a', 'b', 'c', 'b', 'b'];
    return [
      {
        stepIndex: 0,
        title: 'Initialize Window [0..0]',
        description: "Start with index 0 ('a'). Set contains {'a'}. Substring: \"a\" (length 1).",
        codeLine: 'int left = 0; set.insert(s[right]);',
        array: chars,
        activeIndices: [0],
        windowRange: [0, 0],
        pointers: {
          wStart: { index: 0, label: 'L (0)', color: 'var(--verdigris)' },
          wEnd: { index: 0, label: 'R (0)', color: 'var(--amber)' },
        },
        variables: { window: '"a"', maxLen: 1, left: 0, right: 0 },
      },
      {
        stepIndex: 1,
        title: "Expand Window to [0..1] ('b')",
        description: "Char 'b' is unique in window. Expand right pointer. Substring: \"ab\" (length 2).",
        codeLine: 'right++; maxLen = max(maxLen, right - left + 1);',
        array: chars,
        activeIndices: [0, 1],
        windowRange: [0, 1],
        pointers: {
          wStart: { index: 0, label: 'L (0)', color: 'var(--verdigris)' },
          wEnd: { index: 1, label: 'R (1)', color: 'var(--amber)' },
        },
        variables: { window: '"ab"', maxLen: 2, left: 0, right: 1 },
      },
      {
        stepIndex: 2,
        title: "Expand Window to [0..2] ('c') — Max Window Found",
        description: "Char 'c' is unique. Expand right pointer. Substring: \"abc\" (length 3). Update maxLen = 3.",
        codeLine: 'right++; maxLen = max(maxLen, right - left + 1); // maxLen = 3',
        array: chars,
        activeIndices: [0, 1, 2],
        windowRange: [0, 2],
        pointers: {
          wStart: { index: 0, label: 'L (0)', color: 'var(--green)' },
          wEnd: { index: 2, label: 'R (2)', color: 'var(--green)' },
        },
        variables: { window: '"abc"', maxLen: 3, left: 0, right: 2, isNewMax: true },
      },
      {
        stepIndex: 3,
        title: "Duplicate Encountered: 'a' at idx 3 -> Shrink Left",
        description: "Char 'a' is already in window. Advance left pointer past previous occurrence (left = 1). Window: \"bca\" (length 3).",
        codeLine: 'while (set.count(s[right])) set.erase(s[left++]);',
        array: chars,
        activeIndices: [1, 2, 3],
        windowRange: [1, 3],
        dimmedIndices: [0],
        pointers: {
          wStart: { index: 1, label: 'L (1)', color: 'var(--verdigris)' },
          wEnd: { index: 3, label: 'R (3)', color: 'var(--amber)' },
        },
        variables: { window: '"bca"', maxLen: 3, left: 1, right: 3 },
      },
      {
        stepIndex: 4,
        title: "Duplicate Encountered: 'b' at idx 4 -> Shrink Left",
        description: "Char 'b' is already in window. Advance left pointer past previous occurrence (left = 2). Window: \"cab\" (length 3).",
        codeLine: 'while (set.count(s[right])) set.erase(s[left++]);',
        array: chars,
        activeIndices: [2, 3, 4],
        windowRange: [2, 4],
        dimmedIndices: [0, 1],
        pointers: {
          wStart: { index: 2, label: 'L (2)', color: 'var(--verdigris)' },
          wEnd: { index: 4, label: 'R (4)', color: 'var(--amber)' },
        },
        variables: { window: '"cab"', maxLen: 3, left: 2, right: 4 },
      },
      {
        stepIndex: 5,
        title: "Duplicate Encountered: 'c' at idx 5 -> Shrink Left",
        description: "Char 'c' is in window. Advance left pointer (left = 3). Window: \"abc\" (length 3).",
        codeLine: 'while (set.count(s[right])) set.erase(s[left++]);',
        array: chars,
        activeIndices: [3, 4, 5],
        windowRange: [3, 5],
        dimmedIndices: [0, 1, 2],
        pointers: {
          wStart: { index: 3, label: 'L (3)', color: 'var(--verdigris)' },
          wEnd: { index: 5, label: 'R (5)', color: 'var(--amber)' },
        },
        variables: { window: '"abc"', maxLen: 3, left: 3, right: 5 },
      },
      {
        stepIndex: 6,
        title: "Duplicate Encountered: 'b' at idx 6 -> Shrink Left",
        description: "Char 'b' is in window. Advance left pointer to index 5. Window: \"cb\" (length 2).",
        codeLine: 'while (set.count(s[right])) set.erase(s[left++]);',
        array: chars,
        activeIndices: [5, 6],
        windowRange: [5, 6],
        dimmedIndices: [0, 1, 2, 3, 4],
        pointers: {
          wStart: { index: 5, label: 'L (5)', color: 'var(--verdigris)' },
          wEnd: { index: 6, label: 'R (6)', color: 'var(--amber)' },
        },
        variables: { window: '"cb"', maxLen: 3, left: 5, right: 6 },
      },
      {
        stepIndex: 7,
        title: 'Sliding Window Finished',
        description: 'Scanned all characters. Maximum non-repeating substring length is 3 ("abc"). Time complexity: O(N).',
        codeLine: 'return maxLen; // Result: 3',
        array: chars,
        activeIndices: [0, 1, 2],
        windowRange: [0, 2],
        foundIndex: 0,
        variables: { result: 3, optimalSubstring: '"abc"', timeComplexity: 'O(N)' },
      },
    ];
  }

  const arr = [2, 1, 5, 2, 8, 1, 4];
  const k = 3;

  return [
    {
      stepIndex: 0,
      title: `Build Initial Window of Size K = ${k}`,
      description: `Sum elements in initial window [0..2]: 2 + 1 + 5 = 8. Set maxSum = 8.`,
      codeLine: 'for (int i = 0; i < k; i++) windowSum += arr[i];',
      array: arr,
      activeIndices: [0, 1, 2],
      windowRange: [0, 2],
      pointers: {
        wStart: { index: 0, label: 'L', color: 'var(--verdigris)' },
        wEnd: { index: 2, label: 'R', color: 'var(--amber)' },
      },
      variables: { windowRange: '[0..2]', windowSum: 8, maxSum: 8, k },
    },
    {
      stepIndex: 1,
      title: 'Slide Window to [1..3]',
      description: 'Subtract outgoing arr[0] (2) and add incoming arr[3] (2). New windowSum = 8 - 2 + 2 = 8.',
      codeLine: 'windowSum += arr[i] - arr[i - k];',
      array: arr,
      activeIndices: [1, 2, 3],
      windowRange: [1, 3],
      dimmedIndices: [0],
      pointers: {
        wStart: { index: 1, label: 'L', color: 'var(--verdigris)' },
        wEnd: { index: 3, label: 'R', color: 'var(--amber)' },
      },
      variables: { windowRange: '[1..3]', windowSum: 8, maxSum: 8 },
    },
    {
      stepIndex: 2,
      title: 'Slide Window to [2..4] — New Max Window (15)!',
      description: 'Subtract arr[1] (1) and add arr[4] (8). New windowSum = 8 - 1 + 8 = 15. Update maxSum = 15!',
      codeLine: 'maxSum = max(maxSum, windowSum); // New Max',
      array: arr,
      activeIndices: [2, 3, 4],
      windowRange: [2, 4],
      dimmedIndices: [0, 1],
      pointers: {
        wStart: { index: 2, label: 'L', color: 'var(--green)' },
        wEnd: { index: 4, label: 'R (MAX)', color: 'var(--green)' },
      },
      variables: { windowRange: '[2..4]', windowSum: 15, maxSum: 15, isNewMax: true },
    },
    {
      stepIndex: 3,
      title: 'Slide Window to [3..5]',
      description: 'Subtract arr[2] (5) and add arr[5] (1). New windowSum = 15 - 5 + 1 = 11. maxSum remains 15.',
      codeLine: 'windowSum += arr[i] - arr[i - k];',
      array: arr,
      activeIndices: [3, 4, 5],
      windowRange: [3, 5],
      dimmedIndices: [0, 1, 2],
      pointers: {
        wStart: { index: 3, label: 'L', color: 'var(--verdigris)' },
        wEnd: { index: 5, label: 'R', color: 'var(--amber)' },
      },
      variables: { windowRange: '[3..5]', windowSum: 11, maxSum: 15 },
    },
    {
      stepIndex: 4,
      title: 'Slide Window to [4..6] (Final Window)',
      description: 'Subtract arr[3] (2) and add arr[6] (4). New windowSum = 11 - 2 + 4 = 13. Reached end.',
      codeLine: 'windowSum += arr[i] - arr[i - k];',
      array: arr,
      activeIndices: [4, 5, 6],
      windowRange: [4, 6],
      dimmedIndices: [0, 1, 2, 3],
      pointers: {
        wStart: { index: 4, label: 'L', color: 'var(--verdigris)' },
        wEnd: { index: 6, label: 'R', color: 'var(--amber)' },
      },
      variables: { windowRange: '[4..6]', windowSum: 13, maxSum: 15 },
    },
    {
      stepIndex: 5,
      title: 'Sliding Window Evaluation Finished',
      description: 'Maximum contiguous subarray sum of length 3 is 15. Completed in linear O(N) operations.',
      codeLine: 'return maxSum; // 15',
      array: arr,
      activeIndices: [2, 3, 4],
      windowRange: [2, 4],
      variables: { result: 15, optimalWindow: '[2..4]', timeComplexity: 'O(N)' },
    },
  ];
}

/**
 * Step generator for Stack / Queue Operations
 */
function generateStackQueueSteps(): VisualStep[] {
  const tokens = ['(', '[', '{', '}', ']', ')'];

  return [
    {
      stepIndex: 0,
      title: 'Initialize Empty LIFO Stack',
      description: 'Validating bracket sequence: ( [ { } ] ). Stack initialized to empty [].',
      codeLine: 'stack<char> st;',
      array: tokens,
      activeIndices: [0],
      stack: [],
      pointers: { token: { index: 0, label: 'token: (', color: 'var(--verdigris)' } },
      variables: { currentToken: '(', stackSize: 0, status: 'Processing' },
    },
    {
      stepIndex: 1,
      title: "Push '(' onto Stack",
      description: "Encountered opening bracket '('. Push onto stack. Stack size becomes 1.",
      codeLine: "st.push('(');",
      array: tokens,
      activeIndices: [1],
      stack: ['('],
      pointers: { token: { index: 1, label: 'token: [', color: 'var(--verdigris)' } },
      variables: { currentToken: '[', stackTop: '(', stackSize: 1 },
    },
    {
      stepIndex: 2,
      title: "Push '[' onto Stack",
      description: "Encountered opening bracket '['. Push onto stack. Stack size becomes 2.",
      codeLine: "st.push('[');",
      array: tokens,
      activeIndices: [2],
      stack: ['(', '['],
      pointers: { token: { index: 2, label: 'token: {', color: 'var(--verdigris)' } },
      variables: { currentToken: '{', stackTop: '[', stackSize: 2 },
    },
    {
      stepIndex: 3,
      title: "Push '{' onto Stack",
      description: "Encountered opening bracket '{'. Push onto stack. Stack size becomes 3.",
      codeLine: "st.push('{');",
      array: tokens,
      activeIndices: [3],
      stack: ['(', '[', '{'],
      pointers: { token: { index: 3, label: 'token: }', color: 'var(--amber)' } },
      variables: { currentToken: '}', stackTop: '{', stackSize: 3 },
    },
    {
      stepIndex: 4,
      title: "Match & Pop '{' for '}'",
      description: "Closing '}' matches top '{'. Pop from stack! Stack size returns to 2.",
      codeLine: "if (st.top() == '{') st.pop();",
      array: tokens,
      activeIndices: [4],
      stack: ['(', '['],
      pointers: { token: { index: 4, label: 'token: ]', color: 'var(--amber)' } },
      variables: { currentToken: ']', matched: '{ }', stackSize: 2 },
    },
    {
      stepIndex: 5,
      title: "Match & Pop '[' for ']'",
      description: "Closing ']' matches top '['. Pop from stack! Stack size returns to 1.",
      codeLine: "if (st.top() == '[') st.pop();",
      array: tokens,
      activeIndices: [5],
      stack: ['('],
      pointers: { token: { index: 5, label: 'token: )', color: 'var(--amber)' } },
      variables: { currentToken: ')', matched: '[ ]', stackSize: 1 },
    },
    {
      stepIndex: 6,
      title: "Match & Pop '(' for ')' — Expression Valid!",
      description: "Closing ')' matches top '('. Stack is now empty! Sequence is completely valid.",
      codeLine: 'return st.empty(); // true',
      array: tokens,
      stack: [],
      variables: { valid: true, stackEmpty: true, timeComplexity: 'O(N)' },
    },
  ];
}

/**
 * Step generator for Binary Search
 */
function generateBinarySearchSteps(): VisualStep[] {
  const arr = [1, 3, 5, 7, 9, 11, 13, 17, 19, 23];
  const target = 13;

  return [
    {
      stepIndex: 0,
      title: 'Initialize Binary Search Bounds',
      description: `Searching for target = ${target} in 10-element sorted array. low = 0, high = 9.`,
      codeLine: 'int low = 0, high = n - 1;',
      array: arr,
      activeIndices: [0, 4, 9],
      pointers: {
        low: { index: 0, label: 'LOW', color: 'var(--verdigris)' },
        mid: { index: 4, label: 'MID (9)', color: 'var(--amber)' },
        high: { index: 9, label: 'HIGH', color: 'var(--verdigris)' },
      },
      variables: { low: 0, high: 9, mid: 4, 'arr[mid]': 9, target: 13 },
    },
    {
      stepIndex: 1,
      title: 'arr[mid] (9) < target (13) -> Discard Left Half',
      description: 'Since 9 < 13, target must lie strictly in right half. Set low = mid + 1 = 5.',
      codeLine: 'if (arr[mid] < target) low = mid + 1;',
      array: arr,
      activeIndices: [5, 7, 9],
      dimmedIndices: [0, 1, 2, 3, 4],
      pointers: {
        low: { index: 5, label: 'LOW (11)', color: 'var(--verdigris)' },
        mid: { index: 7, label: 'MID (17)', color: 'var(--amber)' },
        high: { index: 9, label: 'HIGH', color: 'var(--verdigris)' },
      },
      variables: { low: 5, high: 9, mid: 7, 'arr[mid]': 17, target: 13 },
    },
    {
      stepIndex: 2,
      title: 'arr[mid] (17) > target (13) -> Discard Right Half',
      description: '17 is greater than target (13). Eliminate elements from index 7 to 9. Set high = mid - 1 = 6.',
      codeLine: 'else if (arr[mid] > target) high = mid - 1;',
      array: arr,
      activeIndices: [5, 5, 6],
      dimmedIndices: [0, 1, 2, 3, 4, 7, 8, 9],
      pointers: {
        low: { index: 5, label: 'LOW', color: 'var(--verdigris)' },
        mid: { index: 5, label: 'MID (11)', color: 'var(--amber)' },
        high: { index: 6, label: 'HIGH', color: 'var(--verdigris)' },
      },
      variables: { low: 5, high: 6, mid: 5, 'arr[mid]': 11, target: 13 },
    },
    {
      stepIndex: 3,
      title: 'arr[mid] (11) < target (13) -> low = 6',
      description: '11 is smaller than 13. Set low = mid + 1 = 6.',
      codeLine: 'low = mid + 1;',
      array: arr,
      activeIndices: [6],
      dimmedIndices: [0, 1, 2, 3, 4, 5, 7, 8, 9],
      pointers: {
        low: { index: 6, label: 'L', color: 'var(--verdigris)' },
        mid: { index: 6, label: 'MID (13)', color: 'var(--amber)' },
        high: { index: 6, label: 'H', color: 'var(--verdigris)' },
      },
      variables: { low: 6, high: 6, mid: 6, 'arr[mid]': 13, target: 13 },
    },
    {
      stepIndex: 4,
      title: 'Target Found at Index 6 in O(log N)!',
      description: `arr[6] == 13 == target! Found target in just 4 iterations (log2(10) ≈ 3.3).`,
      codeLine: 'return mid; // Index 6 (Found)',
      array: arr,
      activeIndices: [6],
      foundIndex: 6,
      dimmedIndices: [0, 1, 2, 3, 4, 5, 7, 8, 9],
      pointers: {
        mid: { index: 6, label: 'TARGET [6]', color: 'var(--green)' },
      },
      variables: { index: 6, comparisons: 4, timeComplexity: 'O(log N)' },
    },
  ];
}

export const AlgorithmVisualizer: React.FC<Props> = ({ problem, isOpen, onClose }) => {
  const detectedPattern = useMemo(() => detectPatternFromProblem(problem), [problem]);
  const [selectedPattern, setSelectedPattern] = useState<AlgorithmPattern>(detectedPattern);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1200); // ms per step
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Sync detected pattern when problem changes
  useEffect(() => {
    setSelectedPattern(detectedPattern);
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [detectedPattern, problem?.id]);

  // Generate steps based on active pattern
  const steps: VisualStep[] = useMemo(() => {
    switch (selectedPattern) {
      case 'two-pointers':
        return generateTwoPointerSteps();
      case 'sliding-window':
        return generateSlidingWindowSteps(problem);
      case 'stack-queue':
        return generateStackQueueSteps();
      case 'binary-search':
        return generateBinarySearchSteps();
      case 'array-traversal':
      default:
        return generateArrayTraversalSteps();
    }
  }, [selectedPattern, problem]);

  const currentStep = steps[currentStepIdx] || steps[0];

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, steps.length, playbackSpeed]);

  const handleNext = useCallback(() => {
    setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1));
  }, [steps.length]);

  const handlePrev = useCallback(() => {
    setCurrentStepIdx(prev => Math.max(0, prev - 1));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--obsidian)]/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[var(--r-lg)] bg-[var(--carbon)] border border-[var(--border-strong)] shadow-2xl overflow-hidden page-fade">
        
        {/* Visualizer Top Bar */}
        <div className="h-12 border-b border-[var(--border)] bg-[var(--ash)] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[var(--r-sm)] bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--verdigris)]">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--bone)] font-mono">
                  Algorithm Visualizer
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-[var(--carbon)] border border-[var(--border)] text-[10px] font-mono text-[var(--verdigris)] font-semibold">
                  Press V to toggle
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-3)] font-mono truncate max-w-xs sm:max-w-md">
                Interactive pattern execution for: <span className="text-[var(--bone)]">{problem.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[var(--text-3)] hover:text-[var(--bone)] p-1.5 rounded hover:bg-[var(--carbon)] transition-colors cursor-pointer"
            title="Close Visualizer (Esc / V)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pattern Selector Tabs */}
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--carbon)] flex items-center justify-between gap-2 overflow-x-auto text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-3)] mr-1 hidden sm:inline">Pattern:</span>
            
            {[
              { id: 'array-traversal', label: 'Array Traversal' },
              { id: 'two-pointers', label: 'Two Pointers' },
              { id: 'sliding-window', label: 'Sliding Window' },
              { id: 'stack-queue', label: 'Stack / Queue' },
              { id: 'binary-search', label: 'Binary Search' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedPattern(tab.id as AlgorithmPattern);
                  setCurrentStepIdx(0);
                  setIsPlaying(false);
                }}
                className={`px-2.5 py-1 rounded-[var(--r-sm)] transition-all cursor-pointer ${
                  selectedPattern === tab.id
                    ? 'bg-[var(--verdigris)] text-[var(--obsidian)] font-bold shadow-xs'
                    : 'bg-[var(--ash)] text-[var(--text-2)] hover:text-[var(--bone)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {detectedPattern === selectedPattern && (
            <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--verdigris)] text-[10px] font-mono border border-[var(--accent-border)] hidden md:inline-block">
              Auto-detected from tags
            </span>
          )}
        </div>

        {/* Visualizer Canvas & Stepper Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[var(--obsidian)]">
          
          {/* Active Step Card */}
          <div className="p-4 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--verdigris)] font-semibold">
                <span className="px-2 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)] text-[var(--bone)]">
                  Step {currentStepIdx + 1} of {steps.length}
                </span>
                <span>•</span>
                <span>{currentStep.title}</span>
              </div>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Step Code Snippet Highlight */}
            <div className="px-3 py-1.5 rounded-[var(--r-sm)] bg-[var(--obsidian)] border border-[var(--border)] font-mono text-xs text-[var(--verdigris)] shrink-0 self-start sm:self-auto">
              <code>{currentStep.codeLine}</code>
            </div>
          </div>

          {/* MAIN GRAPHICAL STATE CANVAS */}
          <div className="p-6 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)] min-h-[220px] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
            
            {/* Array Pattern Visualization (Array Traversal, Two Pointers, Sliding Window, Binary Search) */}
            {currentStep.array && (
              <div className="w-full flex flex-col items-center gap-2">
                
                {/* Top Pointer Badges */}
                <div className="flex items-center justify-center gap-2 sm:gap-3.5 flex-wrap min-h-[28px]">
                  {currentStep.array.map((_, idx) => {
                    const matchedPointers = Object.entries(currentStep.pointers || {})
                      .filter(([_, ptr]) => ptr.index === idx);

                    return (
                      <div key={idx} className="w-10 sm:w-12 text-center">
                        {matchedPointers.map(([key, ptr]) => (
                          <div 
                            key={key}
                            style={{ borderColor: ptr.color, color: ptr.color }}
                            className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-[var(--ash)] border transition-all duration-150 shadow-xs inline-block truncate max-w-full"
                          >
                            {ptr.label}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Array Elements Row with CSS Animated Transitions */}
                <div className="flex items-center justify-center gap-2 sm:gap-3.5 flex-wrap relative p-2">
                  {currentStep.array.map((val, idx) => {
                    const isActive = currentStep.activeIndices?.includes(idx);
                    const isDimmed = currentStep.dimmedIndices?.includes(idx);
                    const isFound = currentStep.foundIndex === idx;
                    const isInWindow = currentStep.windowRange && idx >= currentStep.windowRange[0] && idx <= currentStep.windowRange[1];

                    return (
                      <div
                        key={idx}
                        className={`w-10 h-12 sm:w-12 sm:h-14 rounded-[var(--r-md)] flex flex-col items-center justify-center font-mono font-bold text-sm transition-all duration-200 relative border ${
                          isFound
                            ? 'bg-[var(--green-dim)] text-[var(--green)] border-[var(--green)] scale-105 shadow-md ring-1 ring-[var(--green)]/50'
                            : isInWindow
                            ? 'bg-[var(--accent-dim)] text-[var(--bone)] border-[var(--verdigris)] shadow-sm'
                            : isActive
                            ? 'bg-[var(--ash)] text-[var(--bone)] border-[var(--verdigris)] shadow-sm'
                            : isDimmed
                            ? 'bg-[var(--obsidian)] text-[var(--text-3)] border-[var(--border)] opacity-35'
                            : 'bg-[var(--obsidian)] text-[var(--bone)] border-[var(--border)] hover:border-[var(--text-3)]'
                        }`}
                      >
                        <span>{val}</span>
                        <span className="text-[9px] font-normal text-[var(--text-3)] opacity-70">
                          {idx}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] font-mono text-[var(--text-3)] mt-1">
                  Indices (0 to {currentStep.array.length - 1})
                </div>
              </div>
            )}

            {/* Stack Visualizer Display (for stack-queue pattern) */}
            {selectedPattern === 'stack-queue' && (
              <div className="w-full flex flex-col items-center gap-3 pt-2">
                <span className="text-xs font-mono text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--verdigris)]" />
                  <span>LIFO Stack Memory Frame</span>
                </span>

                <div className="w-48 min-h-[120px] rounded-b-[var(--r-md)] border-2 border-t-0 border-[var(--verdigris)]/60 bg-[var(--obsidian)] p-2 flex flex-col-reverse gap-1.5 items-center shadow-inner">
                  {currentStep.stack && currentStep.stack.length > 0 ? (
                    currentStep.stack.map((item, idx) => (
                      <div 
                        key={idx}
                        className="w-full py-1.5 text-center font-mono text-xs font-bold rounded bg-[var(--accent-dim)] border border-[var(--verdigris)] text-[var(--verdigris)] transition-all duration-300"
                      >
                        {item} {idx === currentStep.stack!.length - 1 && '← Top'}
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] font-mono text-[var(--text-3)] my-auto">
                      [ Stack is Empty ]
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Variables & State Telemetry Table */}
          {currentStep.variables && (
            <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)] font-mono text-xs space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold block">
                Runtime Variables & State:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(currentStep.variables).map(([k, v]) => (
                  <div key={k} className="p-2 rounded bg-[var(--ash)] border border-[var(--border)]">
                    <span className="text-[var(--text-3)] text-[10px] block">{k}</span>
                    <span className="font-bold text-[var(--bone)] text-xs truncate block">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Stepper Playback Toolbar */}
        <div className="p-3.5 border-t border-[var(--border)] bg-[var(--ash)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          
          {/* Progress Bar & Step Navigation */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleReset}
              className="p-1.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--bone)] hover:bg-[var(--ash)] transition-colors cursor-pointer"
              title="Reset to Step 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="btn-secondary !px-2.5 !py-1 !text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-bold !px-3.5 !py-1 !text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIdx === steps.length - 1}
              className="btn-secondary !px-2.5 !py-1 !text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Controls & Close */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[var(--text-3)] mr-1">Speed:</span>
              {[
                { label: '0.5x', delay: 1800 },
                { label: '1x', delay: 1200 },
                { label: '2x', delay: 600 },
              ].map(spd => (
                <button
                  key={spd.label}
                  onClick={() => setPlaybackSpeed(spd.delay)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    playbackSpeed === spd.delay
                      ? 'bg-[var(--carbon)] text-[var(--verdigris)] font-bold border border-[var(--verdigris)]'
                      : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="btn-secondary !px-3 !py-1 !text-xs font-mono cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AlgorithmVisualizer;
