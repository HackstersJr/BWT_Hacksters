---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: ERP Schema Layer

## Objective
Design and implement the SQLite database schema for the core ERP features (Users, Leaves, Assets).

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- src/db/connection.js

## Tasks

<task type="auto">
  <name>Create Database Schema initialization</name>
  <files>
    - src/db/schema.js
  </files>
  <action>
    - Write a script `src/db/schema.js` that initializes the following tables using SQLite data types:
      - `users`: id, username, password_hash, role (Admin, HR, Employee), created_at.
      - `leaves`: id, user_id, start_date, end_date, reason, status (Pending, Approved, Rejected), created_at.
      - `assets`: id, name, type, assigned_to (user_id), status (Available, Assigned, Maintenance), created_at.
    - Ensure tables are created only if they don't exist (`CREATE TABLE IF NOT EXISTS`).
  </action>
  <verify>node src/db/schema.js</verify>
  <done>The three tables (`users`, `leaves`, `assets`) exist in `telemetry.db`.</done>
</task>

<task type="auto">
  <name>Integrate Schema initialization with Server startup</name>
  <files>
    - src/server.js
    - src/db/schema.js
  </files>
  <action>
    - Modify `src/server.js` to run the schema initialization function before starting the Express server to ensure the database is always ready.
  </action>
  <verify>node src/server.js</verify>
  <done>Server starts without errors and the database schema is verified as initialized.</done>
</task>

## Success Criteria
- [ ] Schema script executes cleanly against the SQLite DB.
- [ ] `users`, `leaves`, and `assets` tables exist.
