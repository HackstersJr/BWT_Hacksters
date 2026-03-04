import { useCallback, useEffect, useMemo, useState } from 'react';
import { mockManagerData } from '../data/mockManagerData';
import {
  isIncomingManagerMessage,
  postToHost,
  type IncomingManagerMessage,
} from '../messaging/hostMessaging';
import type { ManagerData, ManagerFilters } from '../types/manager';

export interface ManagerViewState {
  data: ManagerData;
  loading: boolean;
  error?: string;
  lastUpdatedAt?: string;
  refresh: (filters?: ManagerFilters) => void;
  openProject: (projectId: string) => void;
  exportSessions: (format: 'json' | 'csv') => void;
}

const nowIso = (): string => new Date().toISOString();

export const useManagerMessaging = (): ManagerViewState => {
  const [data, setData] = useState<ManagerData>(mockManagerData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(nowIso());

  const onIncoming = useCallback((event: MessageEvent<unknown>) => {
    const message = event.data;
    if (!isIncomingManagerMessage(message)) {
      return;
    }

    const typed: IncomingManagerMessage = message;
    if (typed.type === 'historyData') {
      setData(typed.payload);
      setError(undefined);
      setLoading(false);
      setLastUpdatedAt(nowIso());
      return;
    }

    setError(`${typed.payload.code}: ${typed.payload.message}`);
    setLoading(false);
    setLastUpdatedAt(nowIso());
  }, []);

  useEffect(() => {
    window.addEventListener('message', onIncoming);
    return () => {
      window.removeEventListener('message', onIncoming);
    };
  }, [onIncoming]);

  const refresh = useCallback((filters?: ManagerFilters) => {
    setLoading(true);
    setError(undefined);
    postToHost({ type: 'requestRefreshHistory', payload: filters });

    // Mock-first fallback: keep data usable in standalone web runs.
    window.setTimeout(() => {
      setData(mockManagerData);
      setLoading(false);
      setLastUpdatedAt(nowIso());
    }, 120);
  }, []);

  const openProject = useCallback((projectId: string) => {
    postToHost({ type: 'openProject', payload: { projectId } });
  }, []);

  const exportSessions = useCallback((format: 'json' | 'csv') => {
    postToHost({ type: 'exportSessions', payload: { format } });
  }, []);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      lastUpdatedAt,
      refresh,
      openProject,
      exportSessions,
    }),
    [data, loading, error, lastUpdatedAt, refresh, openProject, exportSessions]
  );
};
