// erp/frontend/src/App.jsx
import { useState } from 'react';
import Dashboard from './Dashboard';

export default function App() {
    const [view, setView] = useState('employees');

    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="px-6 py-5 border-b border-gray-800">
                    <h1 className="text-lg font-bold tracking-tight text-white">
                        <span className="text-indigo-400">ERP</span> Testbed
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Benchmark Dashboard</p>
                </div>
                <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                    {[
                        { id: 'employees', label: '👤 Employees', },
                        { id: 'assets', label: '🖥️ Assets', },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setView(id)}
                            className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${view === id
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                <div className="px-5 py-4 border-t border-gray-800">
                    <p className="text-xs text-gray-600">Node.js · Express · SQLite</p>
                    <p className="text-xs text-gray-600">React · Vite · Tailwind</p>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-8 flex-shrink-0">
                    <h2 className="font-semibold text-gray-200 capitalize">{view} Directory</h2>
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 text-xs">
                        Live API
                    </span>
                </header>
                <div className="flex-1 overflow-auto p-8">
                    <Dashboard view={view} />
                </div>
            </main>
        </div>
    );
}
