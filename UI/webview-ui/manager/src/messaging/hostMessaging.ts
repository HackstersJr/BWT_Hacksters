import type { ManagerData, ManagerFilters } from '../types/manager';

export type OutgoingManagerMessage =
  | {
      type: 'requestRefreshHistory';
      payload?: ManagerFilters;
    }
  | {
      type: 'openProject';
      payload: { projectId: string };
    }
  | {
      type: 'exportSessions';
      payload: { format: 'json' | 'csv' };
    };

export type IncomingManagerMessage =
  | {
      type: 'historyData';
      payload: ManagerData;
    }
  | {
      type: 'historyError';
      payload: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

type VsCodeApi = {
  postMessage: (message: unknown) => void;
};

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

export const getVsCodeApi = (): VsCodeApi | undefined => {
  if (typeof window.acquireVsCodeApi === 'function') {
    return window.acquireVsCodeApi();
  }
  return undefined;
};

export const postToHost = (message: OutgoingManagerMessage): void => {
  const vscode = getVsCodeApi();
  if (!vscode) {
    return;
  }

  vscode.postMessage(message);
};

export const isIncomingManagerMessage = (value: unknown): value is IncomingManagerMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as { type?: unknown };
  return maybe.type === 'historyData' || maybe.type === 'historyError';
};
