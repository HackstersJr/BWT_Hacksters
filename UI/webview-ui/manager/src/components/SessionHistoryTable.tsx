import type { SessionSummary } from '../types/manager';

interface SessionHistoryTableProps {
  sessions: SessionSummary[];
  onOpenProject: (projectId: string) => void;
}

const shortDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmt = (v: number): string => v.toLocaleString();

export default function SessionHistoryTable({ sessions, onOpenProject }: SessionHistoryTableProps) {
  return (
    <section className="history-section">
      <header className="section-header">
        <h2>Session History</h2>
        <span className="session-count">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Project</th>
              <th>File</th>
              <th>Summary</th>
              <th>Tutorial</th>
              <th>Prompt</th>
              <th>Completion</th>
              <th>Saved</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No sessions match the current filters.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td>{shortDateTime(s.timestamp)}</td>
                  <td>{s.projectName}</td>
                  <td className="mono">{s.fileName}</td>
                  <td>{s.codeSummary}</td>
                  <td>
                    <a href={s.tutorialUrl} target="_blank" rel="noreferrer">
                      Open Tutorial
                    </a>
                  </td>
                  <td className="token-cell">{fmt(s.tokenStats.promptTokens)}</td>
                  <td className="token-cell">{fmt(s.tokenStats.completionTokens)}</td>
                  <td className="token-cell">
                    {fmt(s.tokenStats.savedTokens)}
                    <span style={{ opacity: 0.5, marginLeft: 4 }}>({s.tokenStats.savedPercent.toFixed(1)}%)</span>
                  </td>
                  <td>
                    <button className="table-action-btn" onClick={() => onOpenProject(s.projectId)}>
                      Open Project
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
