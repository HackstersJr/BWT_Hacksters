import type { GlobalStats } from '../types/manager';

interface StatsCardsProps {
  stats: GlobalStats;
  filteredSessionCount: number;
}

const formatNumber = (value: number): string => value.toLocaleString();

export default function StatsCards({ stats, filteredSessionCount }: StatsCardsProps) {
  return (
    <section className="stats-grid">
      <article className="panel stat-card">
        <h3>Sessions</h3>
        <p>{formatNumber(filteredSessionCount)}</p>
        <small>Visible with active filters</small>
      </article>

      <article className="panel stat-card">
        <h3>Projects</h3>
        <p>{formatNumber(stats.totalProjects)}</p>
        <small>Across manager history</small>
      </article>

      <article className="panel stat-card">
        <h3>Prompt Tokens</h3>
        <p>{formatNumber(stats.totalPromptTokens)}</p>
        <small>Total prompt usage</small>
      </article>

      <article className="panel stat-card">
        <h3>Completion Tokens</h3>
        <p>{formatNumber(stats.totalCompletionTokens)}</p>
        <small>Total model output</small>
      </article>

      <article className="panel stat-card">
        <h3>Saved Tokens</h3>
        <p>{formatNumber(stats.totalSavedTokens)}</p>
        <small>Selection-first savings</small>
      </article>

      <article className="panel stat-card">
        <h3>Avg Savings</h3>
        <p>{stats.averageSavedPercent.toFixed(2)}%</p>
        <small>Global average saved</small>
      </article>
    </section>
  );
}
