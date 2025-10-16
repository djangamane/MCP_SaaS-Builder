'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import McpServerStatus from '@/components/McpServerStatus';
import OrchestrationLog from '@/components/OrchestrationLog';
import SaaSInputForm from '@/components/SaaSInputForm';
import { GitHubIcon } from '@/components/icons';
import { INITIAL_ORCHESTRATION_STEPS, MCP_SERVERS } from '@/constants';
import { OrchestrationEvent, OrchestrationStep, Status } from '@/types';

const DEFAULT_DESCRIPTION =
  'Build a simple bookmark manager SaaS application. Users should be able to sign up, log in, add, categorize, and delete bookmarks. Use a clean, modern interface.';

const ACTIVE_JOB_STORAGE_KEY = 'saas-mcp-orchestrator:activeJobId';

const normalizeStatus = (value: string): Status => {
  switch (value) {
    case Status.InProgress:
      return Status.InProgress;
    case Status.Success:
      return Status.Success;
    case Status.Failure:
      return Status.Failure;
    case Status.Diagnosing:
      return Status.Diagnosing;
    case Status.Fixing:
      return Status.Fixing;
    default:
      return Status.Pending;
  }
};

const normalizeStep = (step: Partial<OrchestrationStep>): OrchestrationStep => ({
  id: step.id ?? -1,
  title: step.title ?? 'Unknown Step',
  details: step.details ?? '',
  service: step.service ?? 'Orchestrator',
  status: step.status ? normalizeStatus(step.status) : Status.Pending,
});

export default function Home() {
  const [saasDescription, setSaasDescription] = useState<string>(DEFAULT_DESCRIPTION);
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [steps, setSteps] = useState<OrchestrationStep[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>(
    'connecting',
  );
  const logEndRef = useRef<HTMLDivElement>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingJobRequestRef = useRef(false);

  const persistActiveJobId = (jobId: string | null) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (jobId) {
      window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, jobId);
    } else {
      window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    }
  };

  useEffect(() => {
    activeJobIdRef.current = activeJobId;
  }, [activeJobId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedJobId = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!storedJobId) {
      return;
    }

    (async () => {
      try {
        const response = await fetch(`/api/jobs/${storedJobId}`);
        if (!response.ok) {
          persistActiveJobId(null);
          return;
        }
        const snapshot = await response.json();
        const job = snapshot.job;
        const stepState: OrchestrationStep[] = snapshot.steps ?? [];

        if (stepState.length > 0) {
          stepState.sort((a, b) => a.id - b.id);
          setSteps(stepState.map((step) => ({ ...step, status: normalizeStatus(step.status) })));
        }

        if (job?.status === 'running' || job?.status === 'queued') {
          setActiveJobId(job.id);
          persistActiveJobId(job.id);
          setIsOrchestrating(true);
        } else {
          setActiveJobId(null);
          persistActiveJobId(null);
          setIsOrchestrating(false);
        }
      } catch {
        persistActiveJobId(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleMessage = (event: MessageEvent<string>) => {
      let data: OrchestrationEvent | undefined;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data) {
        return;
      }

      if ('jobId' in data && data.jobId) {
        if (!activeJobIdRef.current && pendingJobRequestRef.current) {
          setActiveJobId(data.jobId);
          persistActiveJobId(data.jobId);
          pendingJobRequestRef.current = false;
        }

        if (activeJobIdRef.current && data.jobId !== activeJobIdRef.current) {
          return;
        }
      }

      switch (data.type) {
        case 'connection:ack':
          setConnectionState('open');
          break;
        case 'job:queued':
        case 'job:started':
          setIsOrchestrating(true);
          break;
        case 'job:completed':
          setIsOrchestrating(false);
          setActiveJobId(null);
          persistActiveJobId(null);
          break;
        case 'job:failed':
          setIsOrchestrating(false);
          setActiveJobId(null);
          persistActiveJobId(null);
          setErrorMessage(data.error ?? 'Orchestration failed.');
          break;
        case 'step:update': {
          const incoming = normalizeStep(data.step);
          setSteps((prev) => {
            const index = prev.findIndex((item) => item.id === incoming.id);
            if (index === -1) {
              const merged = [...prev, incoming];
              merged.sort((a, b) => a.id - b.id);
              return merged;
            }
            const next = [...prev];
            next[index] = { ...next[index], ...incoming };
            return next;
          });
          if (incoming.status === Status.InProgress) {
            setIsOrchestrating(true);
          }
          break;
        }
        case 'steps:append':
          setSteps((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const additions = data.steps
              .map((step) => normalizeStep(step))
              .filter((step) => !existingIds.has(step.id));
            if (additions.length === 0) {
              return prev;
            }
            const merged = [...prev, ...additions];
            merged.sort((a, b) => a.id - b.id);
            return merged;
          });
          break;
        default:
          break;
      }
    };

    setConnectionState('connecting');
    const source = new EventSource('/api/events');
    eventSourceRef.current = source;

    source.onopen = () => setConnectionState('open');
    source.onmessage = handleMessage as unknown as (event: MessageEvent) => void;
    source.onerror = () => {
      setConnectionState('connecting');
    };

    return () => {
      setConnectionState('closed');
      source.close();
      eventSourceRef.current = null;
    };
  }, []);

  const handleGenerateSaaS = async () => {
    if (isOrchestrating) {
      return;
    }

    setErrorMessage(null);
    setIsOrchestrating(true);
    pendingJobRequestRef.current = true;

    const initialSteps = INITIAL_ORCHESTRATION_STEPS.map((step, index) => ({
      ...step,
      id: index,
      status: Status.Pending,
    }));
    setSteps(initialSteps);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: saasDescription }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof payload.error === 'string'
            ? payload.error
            : 'Failed to start orchestration.';
        setErrorMessage(message);
        setIsOrchestrating(false);
        pendingJobRequestRef.current = false;
        return;
      }

      const payload = await response.json();
      if (payload?.jobId) {
        setActiveJobId(payload.jobId);
        persistActiveJobId(payload.jobId);
      }
      pendingJobRequestRef.current = false;
    } catch (error) {
      setErrorMessage('Network error starting orchestration.');
      setIsOrchestrating(false);
      pendingJobRequestRef.current = false;
    }
  };

  const orchestrationStatus = useMemo(() => {
    const hasFailure = steps.some((step) => step.status === Status.Failure);
    const allSucceeded =
      steps.length > 0 && steps.every((step) => step.status === Status.Success);

    if (isOrchestrating) {
      return { label: 'In Progress', indicator: 'bg-yellow-400 animate-pulse' };
    }
    if (hasFailure) {
      return { label: 'Attention Required', indicator: 'bg-red-400' };
    }
    if (allSucceeded) {
      return { label: 'Completed', indicator: 'bg-green-400' };
    }
    if (steps.length > 0) {
      return { label: 'Pending', indicator: 'bg-gray-500' };
    }
    return { label: 'Idle', indicator: 'bg-gray-500' };
  }, [isOrchestrating, steps]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          SAAS-MCP-Orchestrator
        </h1>
        <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
          An AI-driven orchestrator to generate, deploy, and verify SaaS applications using the Model
          Context Protocol.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Event stream: {connectionState === 'open' ? 'Connected' : connectionState === 'closed' ? 'Disconnected' : 'Connecting…'}
        </p>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3 flex flex-col gap-8">
          <SaaSInputForm
            description={saasDescription}
            setDescription={setSaasDescription}
            onSubmit={handleGenerateSaaS}
            isLoading={isOrchestrating}
            errorMessage={errorMessage}
          />
          <McpServerStatus servers={MCP_SERVERS} />
        </div>

        <div className="lg:w-2/3 flex flex-col bg-gray-950 rounded-lg border border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Orchestration Log</h2>
            <div className="flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-800 border border-gray-600">
              <div className={`w-2 h-2 rounded-full ${orchestrationStatus.indicator}`} />
              <span>{orchestrationStatus.label}</span>
            </div>
          </div>
          <OrchestrationLog steps={steps} logEndRef={logEndRef} />
        </div>
      </main>

      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Built with React, Tailwind CSS, and Gemini</p>
        <a
          href="https://github.com/google/generative-ai-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-white transition-colors"
        >
          <GitHubIcon className="w-4 h-4" />
          View on GitHub
        </a>
      </footer>
    </div>
  );
}
