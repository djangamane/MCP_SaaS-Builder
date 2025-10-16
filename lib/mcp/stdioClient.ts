import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { McpRequestMessage, McpResponseMessage } from '@/lib/mcp/protocol';

interface McpTransportOptions {
  executable: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export class McpStdIoClient {
  private child: ReturnType<typeof spawn> | null = null;
  private buffer = '';
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  constructor(private options: McpTransportOptions) {}

  async open(): Promise<void> {
    if (this.child) {
      return;
    }

    this.child = spawn(this.options.executable, this.options.args, {
      env: { ...process.env, ...this.options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stderr?.setEncoding('utf-8');
    this.child.stdout?.setEncoding('utf-8');

    this.child.stdout?.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this.flushMessages();
    });

    this.child.on('close', () => {
      const error = new Error('MCP process closed unexpectedly.');
      this.pending.forEach((pending) => pending.reject(error));
      this.pending.clear();
      this.child = null;
      this.buffer = '';
    });
  }

  async initialize(params: Record<string, unknown>) {
    return this.call<unknown>('initialize', params);
  }

  async notify(method: string, params?: Record<string, unknown>) {
    if (!this.child) {
      throw new Error('MCP stdio client not opened.');
    }

    const message: McpRequestMessage = {
      jsonrpc: '2.0',
      method,
      id: randomUUID(),
      params,
    };

    this.child.stdin?.write(JSON.stringify(message) + '\n');
  }

  async call<TResult = unknown>(method: string, params?: Record<string, unknown>): Promise<TResult> {
    if (!this.child) {
      throw new Error('MCP stdio client not opened.');
    }

    const id = randomUUID();
    const message: McpRequestMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    this.child.stdin?.write(JSON.stringify(message) + '\n');

    const timeout = this.options.timeoutMs ?? 15000;

    return new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request "${method}" timed out after ${timeout}ms`));
      }, timeout);

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as TResult);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  close(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }

  private flushMessages() {
    while (true) {
      const separator = this.buffer.indexOf('\n');
      if (separator === -1) {
        break;
      }

      const line = this.buffer.slice(0, separator).trim();
      this.buffer = this.buffer.slice(separator + 1);
      if (!line) {
        continue;
      }

      try {
        const parsed = JSON.parse(line) as McpResponseMessage;
        if (parsed && parsed.jsonrpc === '2.0' && parsed.id) {
          const pending = this.pending.get(String(parsed.id));
          if (!pending) {
            continue;
          }
          this.pending.delete(String(parsed.id));

          if (parsed.error) {
            const error = new Error(parsed.error.message);
            pending.reject(error);
          } else {
            pending.resolve(parsed.result);
          }
        }
      } catch (error) {
        // ignore invalid line
      }
    }
  }
}
