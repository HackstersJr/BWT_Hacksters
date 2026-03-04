export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  savedTokens: number;
  savedPercent: number;
}

export interface SessionSummary {
  id: string;
  projectId: string;
  projectName: string;
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

export interface ManagerFilters {
  projectId?: string;
  startDate?: string;
  endDate?: string;
}
