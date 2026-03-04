// erp/frontend/src/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001/api';

// ── Generic data fetcher ─────────────────────────────────────────────────────
function useFetch(endpoint) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/${endpoint}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, reload: load, setData };
}

// ── Shared UI helpers ────────────────────────────────────────────────────────
function Badge({ label, color }) {
    const colors = {
        green: 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-700',
        yellow: 'bg-yellow-900/60  text-yellow-300  ring-1 ring-yellow-700',
        red: 'bg-red-900/60     text-red-300     ring-1 ring-red-700',
        blue: 'bg-indigo-900/60  text-indigo-300  ring-1 ring-indigo-700',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>
            {label}
        </span>
    );
}

function Spinner() {
    return (
        <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function Th({ children }) {
    return (
        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900/50">
            {children}
        </th>
    );
}

function Td({ children }) {
    return <td className="px-5 py-3.5 text-sm text-gray-300 whitespace-nowrap">{children}</td>;
}

// ── Employees View ───────────────────────────────────────────────────────────
function EmployeesView() {
    const { data: employees, loading, error, reload } = useFetch('employees');
    const [form, setForm] = useState({ name: '', role: '', department: '' });
    const [saving, setSaving] = useState(false);

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch(`${API_BASE}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setForm({ name: '', role: '', department: '' });
            reload();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this employee?')) return;
        await fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
        reload();
    }

    return (
        <div className="space-y-6">
            {/* Add Form */}
            <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Add Employee</h3>
                <div className="grid grid-cols-3 gap-3">
                    {['name', 'role', 'department'].map(field => (
                        <input
                            key={field}
                            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                            value={form[field]}
                            onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                            required
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                    ))}
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    {saving ? 'Adding…' : '+ Add Employee'}
                </button>
            </form>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {loading ? (
                    <Spinner />
                ) : error ? (
                    <p className="p-6 text-red-400 text-sm">Error: {error}</p>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>ID</Th><Th>Name</Th><Th>Role</Th><Th>Department</Th><Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-800/40 transition-colors">
                                    <Td><span className="text-gray-500"># {emp.id}</span></Td>
                                    <Td><span className="font-medium text-white">{emp.name}</span></Td>
                                    <Td><Badge label={emp.role} color="blue" /></Td>
                                    <Td>{emp.department}</Td>
                                    <Td>
                                        <button
                                            onClick={() => handleDelete(emp.id)}
                                            className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ── Assets View ──────────────────────────────────────────────────────────────
function AssetsView() {
    const { data: assets, loading, error, reload } = useFetch('assets');
    const [form, setForm] = useState({ asset_name: '', status: 'Available', assigned_to: '' });
    const [saving, setSaving] = useState(false);

    const statusColor = { Available: 'green', Assigned: 'blue', Maintenance: 'yellow' };

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch(`${API_BASE}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, assigned_to: form.assigned_to || null }),
            });
            setForm({ asset_name: '', status: 'Available', assigned_to: '' });
            reload();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this asset?')) return;
        await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
        reload();
    }

    return (
        <div className="space-y-6">
            {/* Add Form */}
            <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Add Asset</h3>
                <div className="grid grid-cols-3 gap-3">
                    <input
                        placeholder="Asset Name"
                        value={form.asset_name}
                        onChange={e => setForm(prev => ({ ...prev, asset_name: e.target.value }))}
                        required
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                        value={form.status}
                        onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                        <option>Available</option>
                        <option>Assigned</option>
                        <option>Maintenance</option>
                    </select>
                    <input
                        placeholder="Assigned To (optional)"
                        value={form.assigned_to}
                        onChange={e => setForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    {saving ? 'Adding…' : '+ Add Asset'}
                </button>
            </form>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {loading ? (
                    <Spinner />
                ) : error ? (
                    <p className="p-6 text-red-400 text-sm">Error: {error}</p>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr>
                                <Th>ID</Th><Th>Asset Name</Th><Th>Status</Th><Th>Assigned To</Th><Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {assets.map(asset => (
                                <tr key={asset.id} className="hover:bg-gray-800/40 transition-colors">
                                    <Td><span className="text-gray-500"># {asset.id}</span></Td>
                                    <Td><span className="font-medium text-white">{asset.asset_name}</span></Td>
                                    <Td><Badge label={asset.status} color={statusColor[asset.status] || 'blue'} /></Td>
                                    <Td>{asset.assigned_to || <span className="text-gray-600 italic">Unassigned</span>}</Td>
                                    <Td>
                                        <button
                                            onClick={() => handleDelete(asset.id)}
                                            className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ── Dashboard Root ───────────────────────────────────────────────────────────
export default function Dashboard({ view }) {
    return view === 'employees' ? <EmployeesView /> : <AssetsView />;
}
