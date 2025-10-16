export interface OrchestrationContext {
  jobId: string;
  description: string;
}

export interface OrchestrationStrategy {
  name: string;
  run(context: OrchestrationContext): Promise<void>;
}
