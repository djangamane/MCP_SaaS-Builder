export interface InitializeParams {
  protocolVersion: string;
  clientInfo: {
    name: string;
    version: string;
  };
  capabilities?: Record<string, unknown>;
}

export interface InitializeResult {
  protocolVersion: string;
  serverInfo: {
    name: string;
    version?: string;
  };
  capabilities?: Record<string, unknown>;
}

export interface ListToolsResult {
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: unknown;
  }>;
}

export interface CallToolResult {
  content?: unknown;
  isError?: boolean;
}

export interface McpRequestMessage<TParams = unknown> {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: TParams;
}

export interface McpResponseMessage<TResult = unknown> {
  jsonrpc: '2.0';
  id?: string;
  result?: TResult;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
