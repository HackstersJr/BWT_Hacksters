interface StatusPanelProps {
  loading: boolean;
  error: string | null;
  context: string | null;
  tokensSaved: number | null;
}

export default function StatusPanel({ loading, error, context, tokensSaved }: StatusPanelProps) {
  return (
    <section className="status-panel" aria-live="polite">
      {loading ? <p className="status-text">Loading...</p> : null}

      {!loading && error ? <p className="status-text error">{error}</p> : null}

      {!loading && !error && context ? (
        <div className="result-wrap">
          <p className="status-text success">Insight generated successfully.</p>
          <p className="context-text">{context}</p>
          <p className="tokens-text">Tokens saved: {tokensSaved?.toLocaleString() ?? '0'}</p>
        </div>
      ) : null}

      {!loading && !error && !context ? <p className="status-text idle">Waiting for input...</p> : null}
    </section>
  );
}
