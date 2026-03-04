import type { ManagerData, SessionSummary } from '../types/manager';

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

const totalPromptTokens = mockSessions.reduce((acc, item) => acc + item.tokenStats.promptTokens, 0);
const totalCompletionTokens = mockSessions.reduce((acc, item) => acc + item.tokenStats.completionTokens, 0);
const totalSavedTokens = mockSessions.reduce((acc, item) => acc + item.tokenStats.savedTokens, 0);
const averageSavedPercent =
  mockSessions.reduce((acc, item) => acc + item.tokenStats.savedPercent, 0) / mockSessions.length;

const uniqueProjectCount = new Set(mockSessions.map((session) => session.projectId)).size;

export const mockManagerData: ManagerData = {
  sessions: mockSessions,
  global: {
    totalSessions: mockSessions.length,
    totalProjects: uniqueProjectCount,
    totalPromptTokens,
    totalCompletionTokens,
    totalSavedTokens,
    averageSavedPercent,
  },
};
