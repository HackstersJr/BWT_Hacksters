import type { FormEvent } from 'react';

interface SidebarFormProps {
  tutorialUrl: string;
  codeSelected: boolean;
  loading: boolean;
  canGenerate: boolean;
  onUrlChange: (value: string) => void;
  onGenerate: () => void;
}

export default function SidebarForm({
  tutorialUrl,
  codeSelected,
  loading,
  canGenerate,
  onUrlChange,
  onGenerate,
}: SidebarFormProps) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canGenerate) {
      return;
    }

    onGenerate();
  };

  return (
    <form className="sidebar-form" onSubmit={onSubmit}>
      <section className={codeSelected ? 'selection-banner selected' : 'selection-banner not-selected'}>
        <span className="selection-icon" aria-hidden="true">
          {codeSelected ? '✓' : '⚠'}
        </span>
        <p className="selection-message">
          {codeSelected ? '✓ Code snippet selected.' : 'Highlight code in the editor to analyze.'}
        </p>
      </section>

      <div className="form-field">
        <label className="field-label" htmlFor="tutorial-url">
          Tutorial URL
        </label>
        <input
          id="tutorial-url"
          className="text-input"
          type="url"
          placeholder="https://youtube.com/... or https://blog.com/..."
          value={tutorialUrl}
          onChange={(event) => onUrlChange(event.target.value)}
          aria-label="Tutorial URL"
        />
      </div>

      <button type="submit" className="primary-btn" disabled={!canGenerate || loading}>
        {loading ? 'Generating...' : 'Generate Insight'}
      </button>
    </form>
  );
}
