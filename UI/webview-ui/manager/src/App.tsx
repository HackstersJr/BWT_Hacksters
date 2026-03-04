import { useMemo, useState } from 'react';
import SessionHistoryTable from './components/SessionHistoryTable';
import StatsCards from './components/StatsCards';
import StatusBar from './components/StatusBar';
import Toolbar from './components/Toolbar';
import { useManagerMessaging } from './hooks/useManagerMessaging';
import type { ManagerFilters, SessionSummary } from './types/manager';

const inRange = (session: SessionSummary, filters: ManagerFilters): boolean => {
  if (filters.projectId && session.projectId !== filters.projectId) {
    return false;
  }

  const sessionDateOnly = session.timestamp.slice(0, 10);

  if (filters.startDate && sessionDateOnly < filters.startDate) {
    return false;
  }

  if (filters.endDate && sessionDateOnly > filters.endDate) {
    return false;
  }

  return true;
};

export default function App() {
  const { data, loading, error, lastUpdatedAt, refresh, openProject, exportSessions } = useManagerMessaging();

  const [filters, setFilters] = useState<ManagerFilters>({});

  const projects = useMemo(
    () =>
      Array.from(new Map(data.sessions.map((session) => [session.projectId, session.projectName])).entries()).map(
        ([id, name]) => ({ id, name })
      ),
    [data.sessions]
  );

  const filteredSessions = useMemo(
    () => data.sessions.filter((session) => inRange(session, filters)),
    [data.sessions, filters]
  );

  const onRefresh = () => {
    refresh(filters);
  };

  return (
    <main className="manager-root">
      <header className="title-row">
        <h1>TraeCodeContext Manager</h1>
        <p>Global session history and token usage overview</p>
      </header>

      <Toolbar
        filters={filters}
        projects={projects}
        onChangeFilters={setFilters}
        onRefresh={onRefresh}
        onExport={exportSessions}
        loading={loading}
      />

      <StatsCards stats={data.global} filteredSessionCount={filteredSessions.length} />

      <SessionHistoryTable sessions={filteredSessions} onOpenProject={openProject} />

      <StatusBar loading={loading} error={error} lastUpdatedAt={lastUpdatedAt} />
    </main>
  );
}
