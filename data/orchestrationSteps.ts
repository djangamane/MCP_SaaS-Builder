export interface BaseOrchestrationStep {
  title: string;
  details: string;
  service: string;
}

export const BASE_ORCHESTRATION_STEPS: BaseOrchestrationStep[] = [
  {
    title: 'Parse SaaS Definition',
    details: 'Analyzing user requirements and planning execution.',
    service: 'Orchestrator',
  },
  {
    title: 'Initialize Project',
    details: 'Setting up project structure and boilerplate using Filesystem MCP.',
    service: 'Filesystem',
  },
  {
    title: 'Create GitHub Repository',
    details: 'Provisioning a new repository for version control.',
    service: 'GitHub',
  },
  {
    title: 'Provision Database',
    details: 'Defining schema and creating tables with Supabase MCP.',
    service: 'Supabase',
  },
  {
    title: 'Generate Backend Code',
    details: 'Creating Supabase Edge Functions for API endpoints.',
    service: 'Orchestrator',
  },
  {
    title: 'Generate Frontend Code',
    details: 'Building Next.js components and pages based on requirements.',
    service: 'Orchestrator',
  },
  {
    title: 'Fetch Documentation',
    details: 'Using Context 7 to ensure latest syntax and best practices.',
    service: 'Context 7',
  },
  {
    title: 'Push to GitHub',
    details: 'Committing initial application code to the repository.',
    service: 'GitHub',
  },
  {
    title: 'Deploy to Vercel',
    details: 'Connecting GitHub repo and deploying the initial version.',
    service: 'Vercel',
  },
  {
    title: 'Run Automated Tests',
    details: 'Executing user flow simulations with Playwright MCP.',
    service: 'Playwright',
  },
  {
    title: 'Verify Runtime Performance',
    details: 'Running Lighthouse audits with Chrome DevTools MCP.',
    service: 'Chrome DevTools',
  },
  {
    title: 'Finalize Deployment',
    details: 'Application successfully built and deployed.',
    service: 'Vercel',
  },
];
