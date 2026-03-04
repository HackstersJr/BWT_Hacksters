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
    <section className="panel toolbar">
      <div className="toolbar-filters">
        <label>
          <span>Project</span>
          <select
            value={filters.projectId ?? ''}
            onChange={(event) =>
              onChangeFilters({
                ...filters,
                projectId: event.target.value || undefined,
              })
            }
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Start date</span>
          <input
            type="date"
            value={filters.startDate ?? ''}
            onChange={(event) =>
              onChangeFilters({
                ...filters,
                startDate: event.target.value || undefined,
              })
            }
          />
        </label>

        <label>
          <span>End date</span>
          <input
            type="date"
            value={filters.endDate ?? ''}
            onChange={(event) =>
              onChangeFilters({
                ...filters,
                endDate: event.target.value || undefined,
              })
            }
          />
        </label>
      </div>

      <div className="toolbar-actions">
        <button className="btn-primary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
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
