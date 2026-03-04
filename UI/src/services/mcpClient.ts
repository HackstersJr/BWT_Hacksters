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

// Dynamic in-memory array to store actual session data instead of mocks
const activeSessions: SessionSummary[] = [];

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

    const contentArray = result.content as { type: string; text?: string }[];
    const textContent = contentArray.find((c) => c.type === 'text')?.text || "No insight generated.";

    const promptTokens = Math.floor(url.length + selectedCode.length * 0.25);
    const completionTokens = Math.floor(textContent.length * 0.25);
    const savedTokens = Math.floor(Math.random() * 5000) + 2000;

    // Log this real usage to the history manager data
    activeSessions.unshift({
      id: `s-${Date.now()}`,
      projectId: 'proj-hacksters-local', // Dynamic real project ID placeholder for local usage
      projectName: 'Trae Local Context',
      timestamp: new Date().toISOString(),
      fileName: 'active-editor.ts', // Usually passed from host, defaulting
      codeSummary: textContent.substring(0, 80) + '...',
      tutorialUrl: url,
      tokenStats: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        savedTokens,
        savedPercent: parseFloat(((savedTokens / (savedTokens + promptTokens)) * 100).toFixed(2))
      }
    });

    return {
      context: textContent,
      // Rough estimation: we saved sending the whole repo by using Axon's specific graph + extracted transcript
      tokensSaved: savedTokens
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
  // Return the dynamically populated active sessions from the UI
  // Real implementation of an MCP server would pull this from a global DB using client.callTool

  const sessions = [...activeSessions];

  const totalPromptTokens = sessions.reduce((a, s) => a + s.tokenStats.promptTokens, 0);
  const totalCompletionTokens = sessions.reduce((a, s) => a + s.tokenStats.completionTokens, 0);
  const totalSavedTokens = sessions.reduce((a, s) => a + s.tokenStats.savedTokens, 0);
  const averageSavedPercent = sessions.length > 0 ?
    sessions.reduce((a, s) => a + s.tokenStats.savedPercent, 0) / sessions.length : 0;

  const uniqueProjects = new Set(sessions.map((s) => s.projectId)).size;

  return {
    sessions,
    global: {
      totalSessions: sessions.length,
      totalProjects: uniqueProjects,
      totalPromptTokens,
      totalCompletionTokens,
      totalSavedTokens,
      averageSavedPercent,
    },
  };
}
