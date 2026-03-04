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

const formatNumber = (value: number): string => value.toLocaleString();

export default function SessionHistoryTable({ sessions, onOpenProject }: SessionHistoryTableProps) {
  return (
    <section className="panel history-panel">
      <header className="panel-header">
        <h2>Session History</h2>
        <span>{sessions.length} session(s)</span>
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
              <th>Actions</th>
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
              sessions.map((session) => (
                <tr key={session.id}>
                  <td>{shortDateTime(session.timestamp)}</td>
                  <td>{session.projectName}</td>
                  <td className="mono">{session.fileName}</td>
                  <td>{session.codeSummary}</td>
                  <td>
                    <a href={session.tutorialUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </td>
                  <td>{formatNumber(session.tokenStats.promptTokens)}</td>
                  <td>{formatNumber(session.tokenStats.completionTokens)}</td>
                  <td>
                    {formatNumber(session.tokenStats.savedTokens)} ({session.tokenStats.savedPercent.toFixed(1)}%)
                  </td>
                  <td>
                    <button onClick={() => onOpenProject(session.projectId)}>Open Project</button>
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
