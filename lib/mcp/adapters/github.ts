import { McpAdapter } from '@/lib/mcp/registry';
import { logOrchestration } from '@/lib/logging';
import { McpStdIoClient } from '@/lib/mcp/stdioClient';
import {
  McpCommandOptions,
  McpCommandRequest,
  McpCommandResult,
} from '@/types';

const GITHUB_EXECUTABLE = process.env.MCP_GITHUB_EXECUTABLE ?? 'npx';
const GITHUB_SERVER_NAME = process.env.MCP_GITHUB_SERVER ?? '@modelcontextprotocol/server-github';
const GITHUB_TOKEN = process.env.MCP_GITHUB_TOKEN;
const GITHUB_TOOLSETS = process.env.MCP_GITHUB_TOOLSETS;

interface GithubToolMap {
  [key: string]: {
    toolName: string;
    mapArgs: (command: McpCommandRequest) => Record<string, unknown>;
  };
}

const toolMap: GithubToolMap = {
  'Create GitHub Repository': {
    toolName: 'create_repository',
    mapArgs: (command) => {
      const name = extractRepoName(command);
      return {
        name,
        description: typeof command.args?.description === 'string' ? command.args.description : undefined,
        private: typeof command.args?.private === 'boolean' ? command.args.private : false,
        autoInit: command.args?.autoInit === true,
      };
    },
  },
  'Push to GitHub': {
    toolName: 'push_files',
    mapArgs: (command) => {
      return {
        owner: process.env.MCP_GITHUB_REPO_OWNER,
        repo: typeof command.args?.repo === 'string' ? command.args.repo : extractRepoName(command),
        branch: typeof command.args?.branch === 'string' ? command.args.branch : 'main',
        message:
          typeof command.args?.message === 'string'
            ? command.args.message
            : 'Automated commit from MCP orchestrator',
        files: Array.isArray(command.args?.files) ? command.args?.files : [],
      };
    },
  },
};

function extractRepoName(command: McpCommandRequest) {
  if (typeof command.args?.name === 'string') {
    return command.args.name;
  }

  if (typeof command.args?.repo === 'string') {
    return command.args.repo;
  }

  if (typeof command.args?.details === 'string') {
    const match = command.args.details.match(/[A-Za-z0-9_-]+/);
    if (match) {
      return match[0];
    }
  }

  if (typeof command.args?.title === 'string') {
    const normalized = command.args.title.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (normalized.length > 0) {
      return normalized;
    }
  }

  throw new Error('Unable to determine repository name for GitHub command.');
}

async function executeGithubCommand(
  command: McpCommandRequest,
  options: McpCommandOptions,
): Promise<McpCommandResult> {
  const mapping = toolMap[command.action];
  if (!mapping) {
    return {
      success: false,
      error: `Unsupported GitHub command "${command.action}"`,
      durationMs: 0,
    };
  }

  if (!GITHUB_TOKEN) {
    return {
      success: false,
      error: 'MCP_GITHUB_TOKEN is not configured.',
      durationMs: 0,
    };
  }

  const start = Date.now();

  const args = [];
  if (GITHUB_EXECUTABLE === 'npx') {
    args.push('--yes');
  }
  args.push(GITHUB_SERVER_NAME, '--stdio');
  if (GITHUB_TOOLSETS && GITHUB_TOOLSETS.trim().length > 0) {
    args.push('--toolsets', GITHUB_TOOLSETS.trim());
  }

  const client = new McpStdIoClient({
    executable: GITHUB_EXECUTABLE,
    args,
    env: {
      MCP_GITHUB_TOKEN: GITHUB_TOKEN,
      MCP_GITHUB_REPO_OWNER: process.env.MCP_GITHUB_REPO_OWNER,
    },
    timeoutMs: 15000,
  });

  try {
    await client.open();
    await client.initialize({
      protocolVersion: '2024-10-07',
      clientInfo: { name: 'mcp-saas-orchestrator', version: '0.0.0' },
      capabilities: {},
    });
    await client.call('tools/list', {});

    const args = mapping.mapArgs(command);
    logOrchestration('info', 'Calling GitHub MCP tool', options.jobId, {
      tool: mapping.toolName,
      args,
    });

    const result = (await client.call('tools/call', {
      name: mapping.toolName,
      arguments: args,
    })) as { content?: unknown; isError?: boolean };

    const durationMs = Date.now() - start;
    if (result?.isError) {
      return {
        success: false,
        error: `GitHub MCP tool "${mapping.toolName}" reported an error.`,
        durationMs,
        metadata: { response: result },
      };
    }
    return {
      success: true,
      output: JSON.stringify(result?.content ?? result ?? {}),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  } finally {
    client.close();
  }
}

export const githubAdapter: McpAdapter = {
  id: 'github',
  label: 'GitHub MCP',
  supports(command: McpCommandRequest) {
    return command.server === 'GitHub' && toolMap[command.action] !== undefined;
  },
  execute(command: McpCommandRequest, options: McpCommandOptions) {
    return executeGithubCommand(command, options);
  },
};
