import React from 'react';
import { OrchestrationStep, Status } from '../types';
import {
  VercelIcon,
  SupabaseIcon,
  GitHubIcon,
  ChromeDevToolsIcon,
  FetchIcon,
  FilesystemIcon,
  PlaywrightIcon,
  Context7Icon
} from './icons';

interface OrchestrationLogProps {
  steps: OrchestrationStep[];
  logEndRef: React.RefObject<HTMLDivElement>;
}

const serviceIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
  'Vercel': VercelIcon,
  'Supabase': SupabaseIcon,
  'GitHub': GitHubIcon,
  'Chrome DevTools': ChromeDevToolsIcon,
  'Fetch': FetchIcon,
  'Filesystem': FilesystemIcon,
  'Playwright': PlaywrightIcon,
  'Context 7': Context7Icon,
  'Orchestrator': () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.6569 8.96023L12.0001 12.0002L6.34326 8.96023L12.0001 5.92023L17.6569 8.96023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.34326 15.0398L12.0001 18.0798L17.6569 15.0398" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.34326 12.0001L12.0001 15.0401L17.6569 12.0001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const StatusIcon: React.FC<{ status: Status }> = ({ status }) => {
  switch (status) {
    case Status.InProgress:
      return <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>;
    case Status.Success:
      return <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
    case Status.Failure:
      return <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
    case Status.Pending:
    default:
      return <div className="w-5 h-5 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-gray-500"></div></div>;
  }
};


const OrchestrationLog: React.FC<OrchestrationLogProps> = ({ steps, logEndRef }) => {
  return (
    <div className="flex-grow p-4 overflow-y-auto font-mono text-sm">
      <div className="flex flex-col gap-3">
        {steps.map((step) => {
          const ServiceIcon = serviceIcons[step.service] || serviceIcons['Orchestrator'];
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <StatusIcon status={step.status} />
                <div className="w-px h-full bg-gray-700"></div>
              </div>
              <div className="flex-grow pb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${step.status === Status.InProgress ? 'bg-cyan-900/50' : 'bg-gray-800'}`}>
                        <ServiceIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <p className={`font-semibold ${step.status === Status.Success ? 'text-gray-300' : 'text-white'}`}>
                            {step.title}
                        </p>
                        <p className="text-xs text-gray-400">{step.details}</p>
                    </div>
                </div>
              </div>
            </div>
          )
        })}
        {steps.length === 0 && (
            <div className="text-center text-gray-500 py-10">
                Awaiting instructions...
            </div>
        )}
      </div>
      <div ref={logEndRef} />
    </div>
  );
};

export default OrchestrationLog;
