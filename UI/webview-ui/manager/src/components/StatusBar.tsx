interface StatusBarProps {
  loading: boolean;
  error?: string;
  lastUpdatedAt?: string;
}

export default function StatusBar({ loading, error, lastUpdatedAt }: StatusBarProps) {
  return (
    <footer className="status-bar" role="status" aria-live="polite">
      <span>{loading ? 'Loading history…' : 'Ready'}</span>
      {lastUpdatedAt ? (
        <span>Last update: {new Date(lastUpdatedAt).toLocaleTimeString()}</span>
      ) : null}
      {error ? <span className="error-text">{error}</span> : null}
    </footer>
  );
}
