export type SupportedLanguage = 'cpp' | 'python' | 'java' | 'javascript';

export interface LanguageConfig {
  name: string;
  image: string;
  fileExtension: string;
  filename: string;
  compileCmd?: string[];
  runCmd: string[];
  timeoutMultiplier: number;
}

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  cpp: {
    name: 'C++ 20 (GCC 13)',
    image: 'gcc:13',
    fileExtension: '.cpp',
    filename: 'solution.cpp',
    compileCmd: ['g++', '-O3', '-std=c++20', '/tmp/solution.cpp', '-o', '/tmp/solution'],
    runCmd: ['/tmp/solution'],
    timeoutMultiplier: 1.0,
  },
  python: {
    name: 'Python 3.12',
    image: 'python:3.12-alpine',
    fileExtension: '.py',
    filename: 'solution.py',
    runCmd: ['python3', '/tmp/solution.py'],
    timeoutMultiplier: 1.5,
  },
  java: {
    name: 'Java 21 (OpenJDK)',
    image: 'openjdk:21-alpine',
    fileExtension: '.java',
    filename: 'Solution.java',
    compileCmd: ['javac', '/tmp/Solution.java'],
    runCmd: ['java', '-XX:+UseSerialGC', '-Xmx256m', '-cp', '/tmp', 'Solution'],
    timeoutMultiplier: 2.0,
  },
  javascript: {
    name: 'JavaScript (Node.js 20)',
    image: 'node:20-alpine',
    fileExtension: '.js',
    filename: 'solution.js',
    runCmd: ['node', '--max-old-space-size=256', '/tmp/solution.js'],
    timeoutMultiplier: 1.2,
  },
};
