export type AnalyzeRequestMessage = {
  type: 'analyzeRequest';
  payload: {
    url: string;
  };
};

export type AnalyzeResponseMessage = {
  type: 'analyzeResponse';
  payload: {
    context: string;
    tokensSaved: number;
  };
};

export type AnalyzeErrorMessage = {
  type: 'analyzeError';
  payload: {
    message: string;
  };
};

export type IncomingSidebarMessage = AnalyzeResponseMessage | AnalyzeErrorMessage;
export type OutgoingSidebarMessage = AnalyzeRequestMessage;

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

export const postToHost = (message: OutgoingSidebarMessage): void => {
  const vscodeApi = getVsCodeApi();
  if (!vscodeApi) {
    return;
  }

  vscodeApi.postMessage(message);
};

export const isIncomingSidebarMessage = (value: unknown): value is IncomingSidebarMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as { type?: unknown };
  return maybe.type === 'analyzeResponse' || maybe.type === 'analyzeError';
};

export const runMockAnalyze = (
  url: string,
  onIncoming: (message: IncomingSidebarMessage) => void
): void => {
  window.setTimeout(() => {
    if (url.toLowerCase().includes('error')) {
      onIncoming({
        type: 'analyzeError',
        payload: {
          message: 'Mock analyze failed. Please check the URL and try again.',
        },
      });
      return;
    }

    onIncoming({
      type: 'analyzeResponse',
      payload: {
        context:
          'Generated mock insight: this selected code can be implemented using the tutorial pattern with modular functions and guard clauses.',
        tokensSaved: 18240,
      },
    });
  }, 1100);
};
