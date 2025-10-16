import { LogLevel, OrchestrationLogEntry } from '@/types';

const formatPrefix = (entry: OrchestrationLogEntry) => {
  const timestamp = new Date(entry.timestamp).toISOString();
  const level = entry.level.toUpperCase();
  const jobSegment = entry.jobId ? ` [${entry.jobId}]` : '';
  return `[${timestamp}] [${level}]${jobSegment}`;
};

export function logOrchestration(
  level: LogLevel,
  message: string,
  jobId?: string,
  data?: Record<string, unknown>,
): OrchestrationLogEntry {
  const entry: OrchestrationLogEntry = {
    level,
    message,
    jobId,
    data,
    timestamp: Date.now(),
  };

  const prefix = formatPrefix(entry);
  if (level === 'error') {
    console.error(prefix, message, data ?? '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data ?? '');
  } else {
    console.log(prefix, message, data ?? '');
  }

  return entry;
}
