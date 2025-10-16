import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OrchestrationStep, Status } from './types';
import { INITIAL_ORCHESTRATION_STEPS, MCP_SERVERS } from './constants';
import McpServerStatus from './components/McpServerStatus';
import OrchestrationLog from './components/OrchestrationLog';
import SaaSInputForm from './components/SaaSInputForm';
import { GitHubIcon } from './components/icons';

const App: React.FC = () => {
  const [saasDescription, setSaasDescription] = useState<string>('Build a simple bookmark manager SaaS application. Users should be able to sign up, log in, add, categorize, and delete bookmarks. Use a clean, modern interface.');
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [steps, setSteps] = useState<OrchestrationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [steps]);

  const runOrchestration = useCallback(() => {
    if (!isOrchestrating || currentStepIndex >= steps.length) {
      if (currentStepIndex >= steps.length && isOrchestrating) {
        setIsOrchestrating(false);
      }
      return;
    }

    const stepToExecute = steps[currentStepIndex];

    const executeStep = (stepId: number) => {
      // Mark as in progress
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: Status.InProgress } : s));

      // Simulate API call / work
      const duration = 1000 + Math.random() * 1500;
      setTimeout(() => {
        // Simulate a failure for demonstration on the "Verify Runtime Performance" step
        const shouldFail = stepToExecute.title === 'Verify Runtime Performance';
        if (shouldFail && !steps.find(s => s.title.includes('Fix'))) {
             setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: Status.Failure } : s));
             
             // Add diagnosis and fix steps
             const diagnosisStep: OrchestrationStep = {
                 id: steps.length + 1,
                 title: 'Diagnose Performance Issue',
                 details: 'Using Chrome DevTools to analyze LCP issues.',
                 status: Status.Pending,
                 service: 'Chrome DevTools',
             };
             const fixStep: OrchestrationStep = {
                 id: steps.length + 2,
                 title: 'Apply Performance Fix',
                 details: 'Refactoring component to optimize image loading.',
                 status: Status.Pending,
                 service: 'GitHub'
             };

             setSteps(prev => [...prev, diagnosisStep, fixStep]);
             setCurrentStepIndex(prev => prev + 1);

        } else {
             setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: Status.Success } : s));
             setCurrentStepIndex(prev => prev + 1);
        }
      }, duration);
    };

    executeStep(stepToExecute.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrchestrating, currentStepIndex, steps]);

  useEffect(() => {
    const timer = setTimeout(runOrchestration, 100);
    return () => clearTimeout(timer);
  }, [runOrchestration]);

  const handleGenerateSaaS = () => {
    if(isOrchestrating) return;

    const initialSteps = INITIAL_ORCHESTRATION_STEPS.map((step, index) => ({
      ...step,
      id: index,
      status: Status.Pending,
    }));
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setIsOrchestrating(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">SAAS-MCP-Orchestrator</h1>
        <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
          An AI-driven orchestrator to generate, deploy, and verify SaaS applications using the Model Context Protocol.
        </p>
      </header>
      
      <main className="flex-grow flex flex-col lg:flex-row gap-8">
        {/* Left Column */}
        <div className="lg:w-1/3 flex flex-col gap-8">
          <SaaSInputForm
            description={saasDescription}
            setDescription={setSaasDescription}
            onSubmit={handleGenerateSaaS}
            isLoading={isOrchestrating}
          />
          <McpServerStatus servers={MCP_SERVERS} />
        </div>

        {/* Right Column */}
        <div className="lg:w-2/3 flex flex-col bg-gray-950 rounded-lg border border-gray-700 shadow-2xl">
           <div className="flex items-center justify-between p-4 border-b border-gray-700">
             <h2 className="text-xl font-semibold text-white">Orchestration Log</h2>
             <div className="flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-800 border border-gray-600">
                <div className={`w-2 h-2 rounded-full ${isOrchestrating ? 'bg-yellow-400 animate-pulse' : steps.length > 0 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>{isOrchestrating ? 'In Progress' : steps.length > 0 && currentStepIndex >= steps.length ? 'Completed' : 'Idle'}</span>
             </div>
           </div>
          <OrchestrationLog steps={steps} logEndRef={logEndRef}/>
        </div>
      </main>

      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Built with React, Tailwind CSS, and Gemini</p>
        <a href="https://github.com/google/generative-ai-docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <GitHubIcon className="w-4 h-4" />
            View on GitHub
        </a>
      </footer>
    </div>
  );
};

export default App;
