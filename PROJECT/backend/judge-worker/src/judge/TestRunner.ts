import { DockerSandbox, dockerSandbox } from '../sandbox/DockerSandbox';
import { SupportedLanguage } from './languages';
import { Verdict } from '../models/Submission';

export interface TestCaseInput {
  input: string;
  expectedOutput: string;
  isSample?: boolean;
}

export interface SingleTestResult {
  testCaseIndex: number;
  passed: boolean;
  verdict: Verdict;
  executionTimeMs: number;
  memoryKb: number;
  stdout: string;
  stderr: string;
  actualOutput: string;
  expectedOutput: string;
  error?: string;
}

export interface EvaluationSummary {
  finalVerdict: Verdict;
  maxExecutionTimeMs: number;
  maxMemoryKb: number;
  testCasesPassed: number;
  totalTestCases: number;
  results: SingleTestResult[];
  compilationError?: string;
  errorLog?: string;
}

export class TestRunner {
  private sandbox: DockerSandbox;

  constructor(sandbox: DockerSandbox = dockerSandbox) {
    this.sandbox = sandbox;
  }

  /**
   * Helper to normalize output for diffing (handles CR/LF line endings and trailing whitespace)
   */
  private normalizeOutput(str: string): string {
    return str
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  /**
   * Run user source code against a test case suite
   */
  public async runAgainstTestCases(params: {
    code: string;
    language: SupportedLanguage;
    testCases: TestCaseInput[];
    timeLimitMs: number;
    memoryLimitMb: number;
  }): Promise<EvaluationSummary> {
    const { code, language, testCases, timeLimitMs, memoryLimitMb } = params;

    const results: SingleTestResult[] = [];
    let finalVerdict: Verdict = 'Accepted';
    let maxExecutionTimeMs = 0;
    let maxMemoryKb = 0;
    let testCasesPassed = 0;
    let compilationError: string | undefined = undefined;
    let errorLog: string | undefined = undefined;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      const execResult = await this.sandbox.runCode({
        language,
        code,
        input: tc.input,
        timeLimitMs,
        memoryLimitMb,
      });

      maxExecutionTimeMs = Math.max(maxExecutionTimeMs, execResult.executionTimeMs);
      maxMemoryKb = Math.max(maxMemoryKb, execResult.memoryKb);

      // Check Compilation Error
      if (execResult.compilationError) {
        compilationError = execResult.compilationError;
        finalVerdict = 'Compilation Error';
        errorLog = execResult.compilationError;
        results.push({
          testCaseIndex: i,
          passed: false,
          verdict: 'Compilation Error',
          executionTimeMs: execResult.executionTimeMs,
          memoryKb: 0,
          stdout: '',
          stderr: execResult.stderr,
          actualOutput: '',
          expectedOutput: tc.expectedOutput,
          error: execResult.compilationError,
        });
        break; // Stop evaluating further test cases on compilation error
      }

      // Check Time Limit Exceeded
      if (execResult.timedOut) {
        if (finalVerdict === 'Accepted') {
          finalVerdict = 'Time Limit Exceeded';
          errorLog = `Time Limit Exceeded on test case #${i + 1}. Execution exceeded ${timeLimitMs}ms threshold.`;
        }
        results.push({
          testCaseIndex: i,
          passed: false,
          verdict: 'Time Limit Exceeded',
          executionTimeMs: execResult.executionTimeMs,
          memoryKb: execResult.memoryKb,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          actualOutput: '',
          expectedOutput: tc.expectedOutput,
          error: errorLog,
        });
        continue;
      }

      // Check Memory Limit Exceeded
      if (execResult.memoryExceeded) {
        if (finalVerdict === 'Accepted') {
          finalVerdict = 'Memory Limit Exceeded';
          errorLog = `Memory Limit Exceeded on test case #${i + 1}. Memory allocated exceeded ${memoryLimitMb}MB limit.`;
        }
        results.push({
          testCaseIndex: i,
          passed: false,
          verdict: 'Memory Limit Exceeded',
          executionTimeMs: execResult.executionTimeMs,
          memoryKb: execResult.memoryKb,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          actualOutput: '',
          expectedOutput: tc.expectedOutput,
          error: errorLog,
        });
        continue;
      }

      // Check Runtime Error
      if (execResult.exitCode !== 0) {
        if (finalVerdict === 'Accepted') {
          finalVerdict = 'Runtime Error';
          errorLog = execResult.stderr || `Process exited with non-zero exit code ${execResult.exitCode}.`;
        }
        results.push({
          testCaseIndex: i,
          passed: false,
          verdict: 'Runtime Error',
          executionTimeMs: execResult.executionTimeMs,
          memoryKb: execResult.memoryKb,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          actualOutput: '',
          expectedOutput: tc.expectedOutput,
          error: execResult.stderr,
        });
        continue;
      }

      // Compare Output
      const normalizedActual = this.normalizeOutput(execResult.stdout);
      const normalizedExpected = this.normalizeOutput(tc.expectedOutput);

      if (normalizedActual === normalizedExpected) {
        testCasesPassed += 1;
        results.push({
          testCaseIndex: i,
          passed: true,
          verdict: 'Accepted',
          executionTimeMs: execResult.executionTimeMs,
          memoryKb: execResult.memoryKb,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          actualOutput: execResult.stdout,
          expectedOutput: tc.expectedOutput,
        });
      } else {
        if (finalVerdict === 'Accepted') {
          finalVerdict = 'Wrong Answer';
          errorLog = `Wrong Answer on test case #${i + 1}.`;
        }
        results.push({
          testCaseIndex: i,
          passed: false,
          verdict: 'Wrong Answer',
          executionTimeMs: execResult.executionTimeMs,
          memoryKb: execResult.memoryKb,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          actualOutput: execResult.stdout,
          expectedOutput: tc.expectedOutput,
          error: `Output mismatch on test case #${i + 1}`,
        });
      }
    }

    return {
      finalVerdict,
      maxExecutionTimeMs,
      maxMemoryKb,
      testCasesPassed,
      totalTestCases: testCases.length,
      results,
      compilationError,
      errorLog,
    };
  }
}

export const testRunner = new TestRunner();
