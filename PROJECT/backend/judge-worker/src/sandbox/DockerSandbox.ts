import Docker from 'dockerode';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createTarArchive } from './tarHelper';
import { LANGUAGE_CONFIGS, SupportedLanguage } from '../judge/languages';
import { logger } from '../logger';

export interface SandboxExecutionParams {
  language: SupportedLanguage;
  code: string;
  input: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  memoryExceeded: boolean;
  compilationError?: string;
  executionTimeMs: number;
  memoryKb: number;
}

export class DockerSandbox {
  private docker: Docker;
  private isConnected: boolean = false;

  constructor() {
    const socketPath = process.env.DOCKER_SOCKET;

    if (socketPath) {
      this.docker = new Docker({ socketPath });
    } else if (os.platform() === 'win32') {
      this.docker = new Docker({ socketPath: '//./pipe/docker_engine' });
    } else {
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }
  }

  /**
   * Check whether the Docker daemon is accessible
   */
  public async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Pull image if not already cached locally
   */
  public async ensureImage(imageName: string): Promise<void> {
    try {
      const images = await this.docker.listImages({
        filters: { reference: [imageName] },
      });
      if (images.length === 0) {
        logger.info(`[Sandbox] Pulling base image: ${imageName}...`);
        const stream = await this.docker.pull(imageName);
        await new Promise((resolve, reject) => {
          this.docker.modem.followProgress(stream, (err, res) => (err ? reject(err) : resolve(res)));
        });
        logger.info(`[Sandbox] Image pulled successfully: ${imageName}`);
      }
    } catch (err: any) {
      logger.warn({ err }, `[Sandbox] Notice checking image ${imageName}: ${err.message}`);
    }
  }

  /**
   * Execute code in an isolated container or fallback to local host execution
   */
  public async runCode(params: SandboxExecutionParams): Promise<SandboxExecutionResult> {
    const { language, code, input, timeLimitMs, memoryLimitMb } = params;
    const langConfig = LANGUAGE_CONFIGS[language];

    if (!langConfig) {
      throw new Error(`Unsupported language for sandboxing: ${language}`);
    }

    const isAvailable = await this.isDockerAvailable();
    if (!isAvailable) {
      // Graceful fallback to host execution when Docker is offline
      return this.runLocally(params);
    }

    const memoryBytes = memoryLimitMb * 1024 * 1024;
    const adjustedTimeoutMs = Math.round(timeLimitMs * langConfig.timeoutMultiplier);

    let container: Docker.Container | null = null;
    let timedOut = false;
    let memoryExceeded = false;
    let timer: NodeJS.Timeout | null = null;

    const startTime = Date.now();

    try {
      // 1. Create secure sandbox container with strict cgroups & privileges
      container = await this.docker.createContainer({
        Image: langConfig.image,
        Cmd: ['sh', '-c', 'sleep 120'], // Idle container keeping alive for exec calls
        NetworkDisabled: true,
        Tty: false,
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: false,
        HostConfig: {
          Memory: memoryBytes,
          MemorySwap: memoryBytes, // Disable swap overcommit
          CpuPeriod: 100000,
          CpuQuota: 50000, // 50% CPU throttle
          PidsLimit: 50, // Prevent fork bombs
          SecurityOpt: ['no-new-privileges'],
          Tmpfs: {
            '/tmp': 'rw,nosuid,size=64m',
          },
        },
      });

      await container.start();

      // 2. Inject source code and testcase input via tar archive into /tmp
      const tarArchive = createTarArchive([
        { name: langConfig.filename, content: code },
        { name: 'input.txt', content: input },
      ]);

      await container.putArchive(tarArchive, { path: '/tmp' });

      // 3. Compile Step (if language requires compilation, e.g. C++, Java)
      if (langConfig.compileCmd) {
        const compileExec = await container.exec({
          Cmd: langConfig.compileCmd,
          AttachStdout: true,
          AttachStderr: true,
        });

        const compileStream = await compileExec.start({ Detach: false });
        const compileOutput = await this.readStreamOutput(compileStream);
        const compileInspect = await compileExec.inspect();

        if (compileInspect.ExitCode !== 0) {
          return {
            stdout: '',
            stderr: compileOutput.stderr || compileOutput.stdout,
            exitCode: compileInspect.ExitCode || 1,
            timedOut: false,
            memoryExceeded: false,
            compilationError: compileOutput.stderr || compileOutput.stdout || 'Compilation failed.',
            executionTimeMs: Date.now() - startTime,
            memoryKb: 0,
          };
        }
      }

      // 4. Execution Step with redirected stdin
      const runShellCommand = `${langConfig.runCmd.join(' ')} < /tmp/input.txt`;
      const runExec = await container.exec({
        Cmd: ['sh', '-c', runShellCommand],
        AttachStdout: true,
        AttachStderr: true,
      });

      const execStartTime = Date.now();

      // Timeout guard: kill container if execution exceeds threshold
      const timeoutPromise = new Promise<{ timedOut: boolean }>((resolve) => {
        timer = setTimeout(async () => {
          timedOut = true;
          try {
            if (container) {
              await container.kill();
            }
          } catch {
            // Container might already be dead
          }
          resolve({ timedOut: true });
        }, adjustedTimeoutMs);
      });

      // Run execution stream
      const executionPromise = (async () => {
        const stream = await runExec.start({ Detach: false });
        const output = await this.readStreamOutput(stream);
        const inspect = await runExec.inspect();
        return {
          timedOut: false,
          output,
          inspect,
        };
      })();

      const raceResult = await Promise.race([executionPromise, timeoutPromise]);
      const executionTimeMs = Date.now() - execStartTime;

      if (timer) clearTimeout(timer);

      if (raceResult.timedOut || timedOut) {
        return {
          stdout: '',
          stderr: `Time Limit Exceeded: Execution exceeded ${timeLimitMs}ms threshold.`,
          exitCode: 124,
          timedOut: true,
          memoryExceeded: false,
          executionTimeMs: adjustedTimeoutMs + 10,
          memoryKb: Math.round(memoryBytes / 1024),
        };
      }

      const execData = raceResult as {
        output: { stdout: string; stderr: string };
        inspect: { ExitCode: number };
      };

      // Measure real RSS memory from container stats
      let measuredMemoryKb = 0;
      try {
        const stats = await (container.stats as any)({ stream: false });
        if (stats && stats.memory_stats) {
          const usage = stats.memory_stats.usage || 0;
          const cache = stats.memory_stats.stats?.cache || stats.memory_stats.stats?.inactive_file || 0;
          const rss = Math.max(0, usage - cache);
          measuredMemoryKb = Math.round(rss / 1024);
        }
      } catch {
        measuredMemoryKb = 0;
      }

      // Check for OOM kill
      try {
        const containerInfo = await container.inspect();
        if (containerInfo.State.OOMKilled) {
          memoryExceeded = true;
        }
      } catch {
        // Ignore inspect error on finished container
      }

      const exitCode = execData.inspect.ExitCode || 0;
      const memoryKb = memoryExceeded
        ? Math.round(memoryBytes / 1024) + 100
        : measuredMemoryKb;

      return {
        stdout: execData.output.stdout,
        stderr: execData.output.stderr,
        exitCode,
        timedOut: false,
        memoryExceeded,
        executionTimeMs,
        memoryKb,
      };
    } catch (error: any) {
      if (timer) clearTimeout(timer);
      return {
        stdout: '',
        stderr: error.message || 'Container execution failure',
        exitCode: 1,
        timedOut: false,
        memoryExceeded: false,
        executionTimeMs: Date.now() - startTime,
        memoryKb: 0,
      };
    } finally {
      // 5. Always safely destroy and remove container
      if (container) {
        try {
          await container.remove({ force: true, v: true });
        } catch {
          // Ignore removal error
        }
      }
    }
  }

  /**
   * Helper to demultiplex Docker stream into stdout and stderr strings
   */
  private async readStreamOutput(stream: NodeJS.ReadableStream): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => {
        // Docker multiplexed stream header: 8 bytes (1st byte: 1=stdout, 2=stderr; 4-7 bytes: size)
        if (chunk.length >= 8 && (chunk[0] === 1 || chunk[0] === 2)) {
          const streamType = chunk[0];
          const payload = chunk.subarray(8);
          if (streamType === 1) {
            stdoutChunks.push(payload);
          } else if (streamType === 2) {
            stderrChunks.push(payload);
          }
        } else {
          stdoutChunks.push(chunk);
        }
      });

      stream.on('end', () => {
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
          stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        });
      });

      stream.on('error', () => {
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
          stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        });
      });
    });
  }

  /**
   * Graceful fallback: execute user code on the host runtime when Docker daemon is not running
   */
  public async runLocally(params: SandboxExecutionParams): Promise<SandboxExecutionResult> {
    const { language, code, input, timeLimitMs } = params;

    if (language === 'cpp' || language === 'java') {
      return {
        stdout: '',
        stderr: `Docker is required to run ${language === 'cpp' ? 'C++' : 'Java'} submissions. Please ensure Docker Desktop is running and restart the judge worker.`,
        exitCode: 1,
        timedOut: false,
        memoryExceeded: false,
        compilationError: `Docker is offline. ${language === 'cpp' ? 'C++ (g++)' : 'Java (javac)'} is not available on the host. Start Docker Desktop and retry.`,
        executionTimeMs: 0,
        memoryKb: 0,
      };
    }

    const langConfig = LANGUAGE_CONFIGS[language];
    const adjustedTimeoutMs = Math.round(timeLimitMs * (langConfig?.timeoutMultiplier || 1.5));

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algoflow-run-'));
    const srcFile = path.join(tmpDir, langConfig.filename);
    const isWindows = os.platform() === 'win32';

    fs.writeFileSync(srcFile, code, 'utf-8');

    const startTime = Date.now();

    try {
      // Execution Step (Python and JavaScript on host)
      let executable = '';
      let execArgs: string[] = [];

      if ((language as SupportedLanguage) === 'python') {
        executable = isWindows ? 'python' : 'python3';
        execArgs = [srcFile];
      } else {
        executable = 'node';
        execArgs = [srcFile];
      }

      const execStartTime = Date.now();
      const runProc = spawnSync(executable, execArgs, {
        cwd: tmpDir,
        input: input || '',
        timeout: adjustedTimeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
        shell: isWindows,
      });

      const execElapsed = Date.now() - execStartTime;
      const timedOut = runProc.error && (runProc.error as any).code === 'ETIMEDOUT';

      if (timedOut) {
        return {
          stdout: '',
          stderr: 'Time Limit Exceeded',
          exitCode: 124,
          timedOut: true,
          memoryExceeded: false,
          executionTimeMs: adjustedTimeoutMs,
          memoryKb: 1024 * 16,
        };
      }

      if (runProc.error) {
        return {
          stdout: '',
          stderr: runProc.error.message || 'Execution error',
          exitCode: 1,
          timedOut: false,
          memoryExceeded: false,
          compilationError: `Runtime launcher error: ${runProc.error.message}`,
          executionTimeMs: execElapsed,
          memoryKb: 0,
        };
      }

      return {
        stdout: (runProc.stdout || '').trimEnd(),
        stderr: runProc.stderr || '',
        exitCode: runProc.status ?? 0,
        timedOut: false,
        memoryExceeded: false,
        executionTimeMs: execElapsed,
        memoryKb: 1024 * 16,
      };
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export const dockerSandbox = new DockerSandbox();

