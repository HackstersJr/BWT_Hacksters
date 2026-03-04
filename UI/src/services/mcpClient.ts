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

// ─── analyzeTutorial ─────────────────────────────────────────────────

/**
 * Sends the tutorial URL + selected code to the MCP backend.
 * Returns a context-aware insight and token-savings metric.
 *
 * TODO (BACKEND): replace the setTimeout mock with your MCP SDK call, e.g.:
 *   const client = getMcpClient();
 *   const res = await client.callTool('analyze', { url, code: selectedCode });
 *   return { context: res.context, tokensSaved: res.tokensSaved };
 */
export async function analyzeTutorial(
  url: string,
  selectedCode: string
): Promise<AnalyzeResult> {

  return new Promise<AnalyzeResult>((resolve, reject) => {
    setTimeout(() => {
      // Simulate failure when the URL contains "error"
      if (url.toLowerCase().includes('error')) {
        reject(new Error('Mock analyze failed. Please check the URL and try again.'));
        return;
      }

      resolve({
        context:
          `[MOCK] Based on the tutorial at "${url}" and ` +
          `${selectedCode.length} characters of selected code, ` +
          'the function implements authentication middleware using JWT tokens. ' +
          'It validates the Bearer header, decodes the payload, and attaches ' +
          'the user context to the request object before passing control downstream.',
        tokensSaved: 8420,
      });
    }, 1100);
  });
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
