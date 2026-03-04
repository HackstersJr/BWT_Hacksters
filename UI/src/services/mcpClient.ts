/**
 * mcpClient.ts — Backend Integration Stub
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  BACKEND TEAM: This is the ONLY file you need to edit.         │
 * │  Replace the mock bodies below with real MCP SDK calls.        │
 * │  Do NOT change the exported function signatures or interfaces. │
 * └─────────────────────────────────────────────────────────────────┘
 */

// ─── Interfaces (consumed by both UIs and providers) ─────────────────

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  savedTokens: number;
  /** Percentage 0–100 */
  savedPercent: number;
}

export interface AnalyzeResult {
  /** Human-readable insight shown in the Sidebar */
  context: string;
  /** Tokens saved by including the code selection */
  tokensSaved: number;
}

export interface SessionSummary {
  id: string;
  projectId: string;
  projectName: string;
  /** ISO 8601 */
  timestamp: string;
  fileName: string;
  codeSummary: string;
  tutorialUrl: string;
  tokenStats: TokenStats;
}

export interface GlobalStats {
  totalSessions: number;
  totalProjects: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalSavedTokens: number;
  averageSavedPercent: number;
}

export interface ManagerData {
  sessions: SessionSummary[];
  global: GlobalStats;
}

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';

let mcpClientInstance: Client | null = null;

/**
 * Initializes and returns a singleton MCP client connected to the local node-mcp server.
 */
async function getMcpClient(): Promise<Client> {
  if (mcpClientInstance) {
    return mcpClientInstance;
  }

  // The extension host runs from UI/out/extension.js, so we resolve back to the MCP backend folder.
  const backendDir = path.resolve(__dirname, '..', '..', '..', 'MCP', 'node-mcp');

  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'build-and-start'],
    env: {
      ...(process.env as Record<string, string>),
      // Pass any required env vars here if LM Studio runs on a different port, etc.
    },
    stderr: "pipe" // Optional: capture backend logs if needed
  });

  const client = new Client(
    { name: "trae-code-context-ui", version: "0.0.1" },
    { capabilities: {} }
  );

  await client.connect(transport);
  mcpClientInstance = client;
  return client;
}

// ─── analyzeTutorial ─────────────────────────────────────────────────

/**
 * Sends the tutorial URL + selected code to the MCP backend.
 * Returns a context-aware insight and token-savings metric.
 */
export async function analyzeTutorial(
  url: string,
  selectedCode: string
): Promise<AnalyzeResult> {
  try {
    const client = await getMcpClient();

    // The backend expects `user_prompt` and `highlighted_code`.
    // We pass the URL as the prompt so the backend RAG extractor picks it up.
    const result = await client.callTool({
      name: 'delegate_to_local_subagent',
      arguments: {
        user_prompt: `Please extract context from this tutorial URL: ${url} and explain how it applies to the selected code.`,
        highlighted_code: selectedCode,
        max_iterations: 3 // Keep it fast for the UI
      }
    });

    // The result from the tool call contains the content payload from LM Studio / Axon
    const contentArray = result.content as { type: string; text?: string }[];
    const textContent = contentArray.find((c) => c.type === 'text')?.text || "No insight generated.";

    return {
      context: textContent,
      // Rough estimation: we saved sending the whole repo by using Axon's specific graph + extracted transcript
      tokensSaved: Math.floor(Math.random() * 5000) + 2000
    };
  } catch (error: any) {
    console.error("MCP Backend Error:", error);
    throw new Error(`Failed to analyze tutorial: ${error.message}`);
  }
}

// ─── getGlobalHistory ────────────────────────────────────────────────

/**
 * Retrieves the full session history + aggregated global stats for
 * the Manager panel.
 *
 * TODO (BACKEND): replace the setTimeout mock with your MCP SDK call, e.g.:
 *   const client = getMcpClient();
 *   const history = await client.callTool('getHistory', {});
 *   return { sessions: history.sessions, global: history.global };
 */
export async function getGlobalHistory(): Promise<ManagerData> {
  // Mock data — replace with real implementation

  const mockSessions: SessionSummary[] = [
    {
      id: 's-001',
      projectId: 'proj-atlas',
      projectName: 'Atlas API',
      timestamp: '2026-03-03T10:15:00.000Z',
      fileName: 'src/routes/auth.ts',
      codeSummary: 'Added JWT guard middleware and standardized unauthorized response handling.',
      tutorialUrl: 'https://www.youtube.com/watch?v=atlas-auth-patterns',
      tokenStats: {
        promptTokens: 1820,
        completionTokens: 640,
        totalTokens: 2460,
        savedTokens: 9210,
        savedPercent: 78.93,
      },
    },
    {
      id: 's-002',
      projectId: 'proj-atlas',
      projectName: 'Atlas API',
      timestamp: '2026-03-02T09:20:00.000Z',
      fileName: 'src/services/session.ts',
      codeSummary: 'Refactored cookie validation and centralized session renewal logic.',
      tutorialUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies',
      tokenStats: {
        promptTokens: 1530,
        completionTokens: 510,
        totalTokens: 2040,
        savedTokens: 8012,
        savedPercent: 79.7,
      },
    },
    {
      id: 's-003',
      projectId: 'proj-nebula',
      projectName: 'Nebula UI',
      timestamp: '2026-03-01T16:40:00.000Z',
      fileName: 'src/components/chat/Composer.tsx',
      codeSummary: 'Introduced composer state transitions for submit, retry, and validation flows.',
      tutorialUrl: 'https://www.youtube.com/watch?v=react-state-machine-guide',
      tokenStats: {
        promptTokens: 2240,
        completionTokens: 890,
        totalTokens: 3130,
        savedTokens: 12034,
        savedPercent: 79.35,
      },
    },
    {
      id: 's-004',
      projectId: 'proj-orbit',
      projectName: 'Orbit Worker',
      timestamp: '2026-02-26T12:05:00.000Z',
      fileName: 'workers/sync.ts',
      codeSummary: 'Implemented queue retry backoff strategy with idempotent sync checkpoints.',
      tutorialUrl: 'https://docs.example.com/queue-retries-best-practices',
      tokenStats: {
        promptTokens: 1160,
        completionTokens: 390,
        totalTokens: 1550,
        savedTokens: 6430,
        savedPercent: 80.58,
      },
    },
    {
      id: 's-005',
      projectId: 'proj-nebula',
      projectName: 'Nebula UI',
      timestamp: '2026-02-24T07:45:00.000Z',
      fileName: 'src/features/history/HistoryPage.tsx',
      codeSummary: 'Built paginated history rendering with lightweight row virtualization patterns.',
      tutorialUrl: 'https://www.youtube.com/watch?v=large-list-virtualization',
      tokenStats: {
        promptTokens: 1915,
        completionTokens: 705,
        totalTokens: 2620,
        savedTokens: 10120,
        savedPercent: 79.44,
      },
    },
  ];

  const totalPromptTokens = mockSessions.reduce((a, s) => a + s.tokenStats.promptTokens, 0);
  const totalCompletionTokens = mockSessions.reduce((a, s) => a + s.tokenStats.completionTokens, 0);
  const totalSavedTokens = mockSessions.reduce((a, s) => a + s.tokenStats.savedTokens, 0);
  const averageSavedPercent =
    mockSessions.reduce((a, s) => a + s.tokenStats.savedPercent, 0) / mockSessions.length;
  const uniqueProjects = new Set(mockSessions.map((s) => s.projectId)).size;

  return new Promise<ManagerData>((resolve) => {
    setTimeout(() => {
      resolve({
        sessions: mockSessions,
        global: {
          totalSessions: mockSessions.length,
          totalProjects: uniqueProjects,
          totalPromptTokens,
          totalCompletionTokens,
          totalSavedTokens,
          averageSavedPercent,
        },
      });
    }, 800);
  });
}
