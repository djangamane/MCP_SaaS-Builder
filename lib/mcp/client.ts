import { logOrchestration } from '@/lib/logging';
import { executeWithAdapter } from '@/lib/mcp/registry';
import { McpCommandOptions, McpCommandRequest, McpCommandResult } from '@/types';

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const waitWithSignal = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Command aborted'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });

export async function executeMcpCommand(
  command: McpCommandRequest,
  options: McpCommandOptions = {},
): Promise<McpCommandResult> {
  const { jobId, mode = 'dry-run', simulateFailure = false, signal } = options;
  const startedAt = Date.now();

  logOrchestration('info', 'Executing MCP command', jobId, {
    server: command.server,
    action: command.action,
    args: command.args,
    mode,
  });

  if (simulateFailure) {
    const delay = randomBetween(400, 900);
    await waitWithSignal(delay, signal);
    const durationMs = Date.now() - startedAt;
    const error = `Simulated failure executing ${command.action} via ${command.server}`;
    logOrchestration('warn', 'MCP command failed', jobId, {
      server: command.server,
      action: command.action,
      error,
      durationMs,
    });
    return {
      success: false,
      error,
      durationMs,
      metadata: { mode, simulated: true },
    };
  }

  if (signal?.aborted) {
    const durationMs = Date.now() - startedAt;
    const message = 'Command aborted';
    logOrchestration('warn', 'MCP command aborted', jobId, {
      server: command.server,
      action: command.action,
      error: message,
    });
    return {
      success: false,
      error: message,
      durationMs,
      metadata: { mode, aborted: true },
    };
  }

  try {
    const result = await executeWithAdapter(command, options);
    const durationMs = Date.now() - startedAt;

    if (result.success) {
      logOrchestration('info', 'MCP command succeeded', jobId, {
        server: command.server,
        action: command.action,
        durationMs,
      });
      return {
        ...result,
        durationMs,
      };
    }

    logOrchestration('error', 'MCP command failed', jobId, {
      server: command.server,
      action: command.action,
      error: result.error,
      durationMs,
    });
    return {
      ...result,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    logOrchestration('error', 'MCP adapter threw error', jobId, {
      server: command.server,
      action: command.action,
      error: message,
      durationMs,
    });
    return {
      success: false,
      error: message,
      durationMs,
      metadata: { mode, adapterError: true },
    };
  }
}
