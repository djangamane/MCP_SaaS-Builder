import { BASE_ORCHESTRATION_STEPS } from './data/orchestrationSteps';
import { McpServer, OrchestrationStep } from './types';
import {
  VercelIcon,
  SupabaseIcon,
  GitHubIcon,
  ChromeDevToolsIcon,
  FetchIcon,
  FilesystemIcon,
  PlaywrightIcon,
  Context7Icon
} from './components/icons';

export const MCP_SERVERS: McpServer[] = [
  { name: 'Vercel', description: 'Deployment & Hosting', icon: VercelIcon },
  { name: 'Supabase', description: 'Database & Backend', icon: SupabaseIcon },
  { name: 'GitHub', description: 'Version Control', icon: GitHubIcon },
  { name: 'Chrome DevTools', description: 'Runtime Verification', icon: ChromeDevToolsIcon },
  { name: 'Fetch', description: 'Web Content Retrieval', icon: FetchIcon },
  { name: 'Filesystem', description: 'Local Code Management', icon: FilesystemIcon },
  { name: 'Playwright', description: 'Automated QA', icon: PlaywrightIcon },
  { name: 'Context 7', description: 'Documentation Access', icon: Context7Icon },
];

export const INITIAL_ORCHESTRATION_STEPS: Omit<OrchestrationStep, 'id' | 'status'>[] =
  BASE_ORCHESTRATION_STEPS;
