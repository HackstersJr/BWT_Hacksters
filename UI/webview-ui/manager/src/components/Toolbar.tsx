import type { ManagerFilters } from '../types/manager';

interface ToolbarProps {
  filters: ManagerFilters;
  projects: Array<{ id: string; name: string }>;
  onChangeFilters: (next: ManagerFilters) => void;
  onRefresh: () => void;
  onExport: (format: 'json' | 'csv') => void;
  loading: boolean;
}

export default function Toolbar({
  filters,
  projects,
  onChangeFilters,
  onRefresh,
  onExport,
  loading,
}: ToolbarProps) {
  return (
    <section className="toolbar">
      <div className="toolbar-filters">
        <label>
          <span className="filter-label">Project</span>
          <select
            value={filters.projectId ?? ''}
            onChange={(e) =>
              onChangeFilters({ ...filters, projectId: e.target.value || undefined })
            }
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="filter-label">Start date</span>
          <input
            type="date"
            value={filters.startDate ?? ''}
            onChange={(e) =>
              onChangeFilters({ ...filters, startDate: e.target.value || undefined })
            }
          />
        </label>

        <label>
          <span className="filter-label">End date</span>
          <input
            type="date"
            value={filters.endDate ?? ''}
            onChange={(e) =>
              onChangeFilters({ ...filters, endDate: e.target.value || undefined })
            }
          />
        </label>
      </div>

      <div className="toolbar-actions">
        <button className="btn-primary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <button className="btn-secondary" onClick={() => onExport('json')} disabled={loading}>
          Export JSON
        </button>
        <button className="btn-secondary" onClick={() => onExport('csv')} disabled={loading}>
          Export CSV
        </button>
      </div>
    </section>
  );
}
