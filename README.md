# SAAS-MCP-Orchestrator: From Prototype to Production

## 1. Introduction

This document outlines the requirements, architecture, and actionable tasks required to evolve the SAAS-MCP-Orchestrator from a browser-based UI prototype into a fully functional, AI-driven application. The goal is to connect the user interface to a real backend orchestration engine that leverages the Gemini API and interacts with the specified Model Context Protocol (MCP) servers.

## 2. Current Environment Analysis

The existing application is a high-fidelity prototype running entirely in a sandboxed browser environment. It's crucial to understand its limitations before transitioning.

*   **Platform**: Browser-based React application.
*   **Architecture**: Single-page application (SPA) with no backend. All logic is client-side.
*   **Orchestration Logic**: The "orchestration" is a simulation. It uses `setTimeout` to mimic asynchronous tasks and follows a hardcoded sequence of steps. State is managed locally within the React `App` component.
*   **MCP Interaction**: There is **no actual communication** with any MCP servers (Vercel, Supabase, etc.). The UI displays their icons and statuses for demonstrative purposes only.
*   **AI Integration**: There is **no connection** to the Gemini API. The "error diagnosis and fix" flow is a hardcoded scenario to demonstrate the concept.

## 3. Local Development Requirements

To build and run the full application locally, you will need the following:

### 3.1. Software
*   **Node.js**: v18.x or later.
*   **npm** or **yarn**: For package management.
*   **Git**: For version control.
*   **A code editor**: Visual Studio Code is recommended.
*   **MCP Servers**: The ability to run command-line processes, as most MCP servers are initiated via `npx`.

### 3.2. Accounts & Credentials
*   **Google AI Studio API Key**: A valid API key for the Gemini API.
*   **GitHub Account**: A personal access token with `repo` and `workflow` scopes.
*   **Vercel Account**: An API token for programmatic control over projects.
*   **Supabase Account**: An API key for managing databases and projects.
*   (Optional) Keys for other services like Context7 if you choose to integrate them.

## 4. Proposed Architecture & Design Implementation

The functional application will shift from a client-only model to a client-server architecture. The frontend remains the user's window into the orchestration process, while a new backend service handles all the heavy lifting.

### 4.1. Frontend (React App)
The existing React components can be largely reused. Its primary role will be:
1.  Capturing the user's SaaS description.
2.  Initiating the orchestration process by sending the description to the backend.
3.  Receiving real-time status updates and logs from the backend via WebSockets.
4.  Rendering the orchestration progress dynamically, just as it does in the prototype.

### 4.2. Backend (Orchestration Engine)
This is the core component to be built. A **Node.js server** (using a framework like Next.js API Routes or Express) is the ideal choice.

**Responsibilities:**
*   **API Endpoint**: Expose an endpoint (e.g., `/api/orchestrate`) to receive the SaaS prompt from the frontend.
*   **WebSocket Server**: Host a WebSocket server to push real-time updates (`OrchestrationStep` status changes, logs, errors) to the connected frontend client.
*   **State Management**: Maintain the state of the generation process for each user session.
*   **AI Core**: Integrate with the Gemini API to drive the decision-making process.
*   **MCP Client**: Execute commands to interact with the various MCP servers.

### 4.3. AI Core Logic (Gemini API with Function Calling)
The backend will not follow a hardcoded sequence. Instead, it will use Gemini's function calling capabilities to determine the next action.

**Workflow:**
1.  **Initial Prompt**: The backend receives the user's SaaS description and formats it into a system prompt for Gemini. This prompt will define the goal and list all available MCP tools as function declarations.
    *   **System Prompt Example**: `"You are an expert SaaS development orchestrator. Your goal is to build a complete application based on the user's request. You have access to a set of tools to accomplish this. Plan your steps, use the tools provided, and do not hallucinate functions."`
2.  **AI Planning Loop**:
    a. The backend sends the current state and prompt to Gemini.
    b. Gemini responds with a desired action in the form of a `functionCall` (e.g., `{"name": "github:createRepo", "args": {"repoName": "bookmark-manager"}}`).
    c. The backend parses this response and identifies the target MCP server and tool.
    d. It executes the corresponding MCP tool (e.g., runs the `npx @modelcontextprotocol/server-github createRepo ...` command).
    e. The backend captures the result (success, failure, data) from the MCP tool.
    f. It sends the result back to Gemini to inform its next decision and repeats the loop.
3.  **Real-time Logging**: At each step (b-f), the backend pushes a status update to the frontend via WebSockets.

## 5. Implementation Tasks: A Step-by-Step Plan

### Phase 1: Project Setup & Backend Foundation
*   [ ] **Task 1.1: Initialize a Next.js Project**: Use `npx create-next-app@latest --typescript` for a modern React and backend framework.
*   [ ] **Task 1.2: Migrate Frontend Components**: Move the existing `components`, `types.ts`, `constants.ts`, and `App.tsx` files into the new Next.js `app` or `pages` directory structure. Adjust imports as needed.
*   [ ] **Task 1.3: Create API Endpoint & WebSocket Server**:
    *   Create an API route (`/app/api/orchestrate/route.ts`).
    *   Integrate a WebSocket library like `ws` or `socket.io` to handle real-time communication.
*   [ ] **Task 1.4: Secure Environment Variables**: Create a `.env.local` file to store all API keys and tokens securely.

### Phase 2: AI Orchestrator & MCP Integration
*   [ ] **Task 2.1: Integrate Gemini SDK**: Add the `@google/genai` package to the backend. Initialize the client using the API key from environment variables.
*   [ ] **Task 2.2: Define Tooling Schema**: For each MCP server tool (e.g., `Vercel:createProject`, `Supabase:createTable`), define a `FunctionDeclaration` schema as per the Gemini SDK documentation. This schema tells the AI what tools are available and what arguments they take.
*   [ ] **Task 2.3: Build the AI Loop**: Implement the core orchestration logic described in section 4.3. This function will be the heart of the application.
*   [ ] **Task 2.4: Create MCP Wrappers**: Write helper functions in the backend to manage interactions with the MCP servers. These wrappers will use Node.js's `child_process` module to spawn `npx` commands, pass arguments, and listen for `stdout` and `stderr` to get results.

### Phase 3: Connecting Frontend to Backend
*   [ ] **Task 3.1: Update Form Submission**: Modify `SaaSInputForm.tsx` to send the SaaS description to your `/api/orchestrate` endpoint using `fetch`.
*   [ ] **Task 3.2: Implement WebSocket Client**: In `App.tsx`, establish a WebSocket connection to the backend. Create a `useEffect` hook to listen for incoming messages and update the `steps` state accordingly.
*   [ ] **Task 3.3: Remove Simulation Logic**: Delete all `setTimeout` simulation code and hardcoded state transitions from the frontend. The frontend should now be a pure reflection of the backend's state.

### Phase 4: Testing & Refinement
*   [ ] **Task 4.1: End-to-End Testing**: Run a full orchestration for a simple SaaS idea (like the bookmark manager).
*   [ ] **Task 4.2: Implement Robust Error Handling**: Ensure that if an MCP command fails or the AI returns an invalid response, the error is caught, logged to the frontend, and the process can either be retried or halted gracefully.
*   [ ] **Task 4.3: Prompt Engineering**: Refine the system prompt and tool descriptions given to Gemini to improve the reliability and accuracy of its plans and tool usage.

***

By following this roadmap, you can systematically convert the impressive UI prototype into a powerful and functional AI-powered SaaS generation tool.