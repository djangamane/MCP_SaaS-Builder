import { ComponentType } from 'react';

export enum Status {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Success = 'Success',
  Failure = 'Failure',
  Diagnosing = 'Diagnosing',
  Fixing = 'Fixing',
}

export interface OrchestrationStep {
  id: number;
  title: string;
  details: string;
  status: Status;
  service: string;
}

export interface McpServer {
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface OrchestrationJob {
  id: string;
  description: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
}

export type OrchestrationEvent =
  | {
      type: 'connection:ack';
      message: string;
      timestamp: number;
    }
  | {
      type: 'job:queued' | 'job:started' | 'job:completed' | 'job:failed';
      jobId: string;
      description?: string;
      error?: string;
    }
  | {
      type: 'step:update';
      jobId: string;
      step: OrchestrationStep;
    }
  | {
      type: 'steps:append';
      jobId: string;
      steps: OrchestrationStep[];
    };

export type LogLevel = 'info' | 'warn' | 'error';

export interface OrchestrationLogEntry {
  level: LogLevel;
  message: string;
  jobId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export type McpExecutionMode = 'dry-run' | 'live';

export interface McpCommandRequest {
  server: string;
  action: string;
  args?: Record<string, unknown>;
}

export interface McpCommandOptions {
  jobId?: string;
  mode?: McpExecutionMode;
  signal?: AbortSignal;
  simulateFailure?: boolean;
  metadata?: Record<string, unknown>;
}

export interface McpCommandResult {
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}
