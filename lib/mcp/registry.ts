import { spawn } from 'node:child_process';
import { logOrchestration } from '@/lib/logging';
import {
  McpCommandOptions,
  McpCommandRequest,
  McpCommandResult,
} from '@/types';
import { githubAdapter } from '@/lib/mcp/adapters/github';

export interface McpAdapter {
  id: string;
  label: string;
  supports(command: McpCommandRequest): boolean;
  execute(command: McpCommandRequest, options: McpCommandOptions): Promise<McpCommandResult>;
}

const adapters: McpAdapter[] = [githubAdapter];

export function registerAdapter(adapter: McpAdapter) {
  adapters.push(adapter);
}

export function findAdapter(command: McpCommandRequest) {
  return adapters.find((adapter) => adapter.supports(command));
}

export async function executeWithAdapter(
  command: McpCommandRequest,
  options: McpCommandOptions,
): Promise<McpCommandResult> {
  const adapter = findAdapter(command);
  if (!adapter) {
    logOrchestration('warn', 'No MCP adapter found for command, returning success', options.jobId, {
      server: command.server,
      action: command.action,
    });
    return {
      success: true,
      output: `No adapter registered for ${command.server}.`,
      durationMs: 0,
      metadata: { simulated: true },
    };
  }
  return adapter.execute(command, options);
}

export function runCommand(
  cmd: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv },
) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? -1,
      });
    });
  });
}
