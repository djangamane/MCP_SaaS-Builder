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
