import { useCallback, useEffect, useMemo, useState } from 'react';
import SidebarForm from './components/SidebarForm';
import StatusPanel from './components/StatusPanel';
import {
  isIncomingSidebarMessage,
  postToHost,
  runMockAnalyze,
  type IncomingSidebarMessage,
} from './messaging';

export default function App() {
  const [tutorialUrl, setTutorialUrl] = useState('');
  const [codeSelected, setCodeSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [tokensSaved, setTokensSaved] = useState<number | null>(null);

  const canGenerate = useMemo(
    () => tutorialUrl.trim().length > 0 && codeSelected,
    [tutorialUrl, codeSelected]
  );

  const onIncoming = useCallback((message: IncomingSidebarMessage) => {
    if (message.type === 'analyzeError') {
      setError(message.payload.message);
      setLoading(false);
      return;
    }

    setContext(message.payload.context);
    setTokensSaved(message.payload.tokensSaved);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent<unknown>) => {
      const message = event.data as { type?: string; payload?: { hasSelection?: boolean } };

      if (message?.type === 'selectionChange') {
        setCodeSelected(Boolean(message.payload?.hasSelection));
        return;
      }

      if (!isIncomingSidebarMessage(event.data)) {
        return;
      }

      onIncoming(event.data);
    };

    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [onIncoming]);

  const handleGenerate = () => {
    if (!canGenerate) {
      return;
    }

    setLoading(true);
    setError(null);
    setContext(null);
    setTokensSaved(null);

    postToHost({
      type: 'analyzeRequest',
      payload: {
        url: tutorialUrl.trim(),
      },
    });

    runMockAnalyze(tutorialUrl.trim(), onIncoming);
  };

  return (
    <div className="sidebar-shell">
      <header className="sidebar-header">
        <h1>TraeCodeContext</h1>
        <p>Generate context-aware insights from tutorials.</p>
      </header>

      <SidebarForm
        tutorialUrl={tutorialUrl}
        codeSelected={codeSelected}
        loading={loading}
        canGenerate={canGenerate}
        onUrlChange={setTutorialUrl}
        onGenerate={handleGenerate}
      />

      <StatusPanel loading={loading} error={error} context={context} tokensSaved={tokensSaved} />
    </div>
  );
}
