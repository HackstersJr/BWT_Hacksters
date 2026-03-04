// erp/backend/src/server.js
// ERP Testbed — Express + SQLite Backend (async/sqlite3)
// Tables: Employees, Assets (seeded with 5 records each)
// Middleware: CORS, JSON, tokenLogger (simulates LLM token tracking)

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const tokenLogger = require('./middleware/tokenLogger');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Database ────────────────────────────────────────────────────────────────
let db;

async function initDB() {
    db = await open({
        filename: path.join(__dirname, '../erp.db'),
        driver: sqlite3.Database,
    });
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA foreign_keys = ON');

    await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      role       TEXT    NOT NULL,
      department TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_name  TEXT    NOT NULL,
      status      TEXT    NOT NULL CHECK(status IN ('Available','Assigned','Maintenance')),
      assigned_to TEXT
    );
  `);

    const empCount = (await db.get('SELECT COUNT(*) as c FROM employees')).c;
    if (empCount === 0) {
        const stmt = await db.prepare('INSERT INTO employees (name, role, department) VALUES (?, ?, ?)');
        for (const r of [
            ['Alice Sharma', 'Software Engineer', 'Engineering'],
            ['Bob Patel', 'HR Manager', 'Human Resources'],
            ['Carol Mendes', 'Product Manager', 'Product'],
            ['David Nguyen', 'DevOps Engineer', 'Infrastructure'],
            ['Eva Williams', 'Data Scientist', 'Analytics'],
        ]) await stmt.run(...r);
        await stmt.finalize();
    }

    const assetCount = (await db.get('SELECT COUNT(*) as c FROM assets')).c;
    if (assetCount === 0) {
        const stmt = await db.prepare('INSERT INTO assets (asset_name, status, assigned_to) VALUES (?, ?, ?)');
        for (const r of [
            ['Dell XPS 15 Laptop', 'Assigned', 'Alice Sharma'],
            ['HP LaserJet 500', 'Available', null],
            ['iPad Pro 12.9', 'Assigned', 'Carol Mendes'],
            ['Cisco VPN Router', 'Maintenance', null],
            ['Logitech MX Master', 'Assigned', 'David Nguyen'],
        ]) await stmt.run(...r);
        await stmt.finalize();
    }

    console.log('[ERP Backend] Database ready at', path.join(__dirname, '../erp.db'));
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/api/employees', tokenLogger);
app.use('/api/assets', tokenLogger);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const usage = (p, c) => ({ prompt_tokens: p, completion_tokens: c });

// ─── Healthcheck ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Employee Routes ──────────────────────────────────────────────────────────
app.get('/api/employees', async (_req, res) => {
    const rows = await db.all('SELECT * FROM employees');
    res.json({ data: rows, usage: usage(12, rows.length * 4) });
});

app.get('/api/employees/:id', async (req, res) => {
    const row = await db.get('SELECT * FROM employees WHERE id = ?', req.params.id);
    if (!row) return res.status(404).json({ error: 'Employee not found' });
    res.json({ data: row, usage: usage(8, 10) });
});

app.post('/api/employees', async (req, res) => {
    const { name, role, department } = req.body;
    if (!name || !role || !department)
        return res.status(400).json({ error: 'name, role, and department are required' });
    const result = await db.run('INSERT INTO employees (name, role, department) VALUES (?, ?, ?)', name, role, department);
    const created = await db.get('SELECT * FROM employees WHERE id = ?', result.lastID);
    res.status(201).json({ data: created, usage: usage(20, 12) });
});

app.put('/api/employees/:id', async (req, res) => {
    const existing = await db.get('SELECT * FROM employees WHERE id = ?', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    const { name, role, department } = req.body;
    await db.run('UPDATE employees SET name = ?, role = ?, department = ? WHERE id = ?',
        name ?? existing.name, role ?? existing.role, department ?? existing.department, req.params.id);
    res.json({ data: await db.get('SELECT * FROM employees WHERE id = ?', req.params.id), usage: usage(18, 10) });
});

app.delete('/api/employees/:id', async (req, res) => {
    const existing = await db.get('SELECT * FROM employees WHERE id = ?', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    await db.run('DELETE FROM employees WHERE id = ?', req.params.id);
    res.json({ data: { deleted: true, id: req.params.id }, usage: usage(10, 5) });
});

// ─── Asset Routes ─────────────────────────────────────────────────────────────
app.get('/api/assets', async (_req, res) => {
    const rows = await db.all('SELECT * FROM assets');
    res.json({ data: rows, usage: usage(12, rows.length * 4) });
});

app.get('/api/assets/:id', async (req, res) => {
    const row = await db.get('SELECT * FROM assets WHERE id = ?', req.params.id);
    if (!row) return res.status(404).json({ error: 'Asset not found' });
    res.json({ data: row, usage: usage(8, 10) });
});

app.post('/api/assets', async (req, res) => {
    const { asset_name, status, assigned_to } = req.body;
    if (!asset_name || !status)
        return res.status(400).json({ error: 'asset_name and status are required' });
    const result = await db.run('INSERT INTO assets (asset_name, status, assigned_to) VALUES (?, ?, ?)',
        asset_name, status, assigned_to ?? null);
    const created = await db.get('SELECT * FROM assets WHERE id = ?', result.lastID);
    res.status(201).json({ data: created, usage: usage(20, 12) });
});

app.put('/api/assets/:id', async (req, res) => {
    const existing = await db.get('SELECT * FROM assets WHERE id = ?', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Asset not found' });
    const { asset_name, status, assigned_to } = req.body;
    await db.run('UPDATE assets SET asset_name = ?, status = ?, assigned_to = ? WHERE id = ?',
        asset_name ?? existing.asset_name, status ?? existing.status,
        assigned_to ?? existing.assigned_to, req.params.id);
    res.json({ data: await db.get('SELECT * FROM assets WHERE id = ?', req.params.id), usage: usage(18, 10) });
});

app.delete('/api/assets/:id', async (req, res) => {
    const existing = await db.get('SELECT * FROM assets WHERE id = ?', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Asset not found' });
    await db.run('DELETE FROM assets WHERE id = ?', req.params.id);
    res.json({ data: { deleted: true, id: req.params.id }, usage: usage(10, 5) });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[ERP Backend] Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('[ERP Backend] Failed to initialize DB:', err);
    process.exit(1);
});

module.exports = app;
