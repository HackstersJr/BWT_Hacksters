import type { GlobalStats } from '../types/manager';

interface StatsCardsProps {
  stats: GlobalStats;
  filteredSessionCount: number;
}

const fmt = (v: number): string => v.toLocaleString();

export default function StatsCards({ stats, filteredSessionCount }: StatsCardsProps) {
  const cards = [
    { label: 'Sessions', value: fmt(filteredSessionCount), sub: 'Visible with active filters' },
    { label: 'Projects', value: fmt(stats.totalProjects), sub: 'Across manager history' },
    { label: 'Prompt Tokens', value: fmt(stats.totalPromptTokens), sub: 'Total prompt usage' },
    { label: 'Completion Tokens', value: fmt(stats.totalCompletionTokens), sub: 'Total model output' },
    { label: 'Saved Tokens', value: fmt(stats.totalSavedTokens), sub: 'Selection-first savings' },
    { label: 'Avg Savings', value: `${stats.averageSavedPercent.toFixed(1)}%`, sub: 'Global average saved' },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article key={card.label} className="stat-card">
          <div className="stat-label">{card.label}</div>
          <div className="stat-value">{card.value}</div>
          <div className="stat-sub">{card.sub}</div>
        </article>
      ))}
    </section>
  );
}
