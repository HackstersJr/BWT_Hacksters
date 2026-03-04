---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Node.js API & SQLite Setup

## Objective
Initialize the Express.js backend and local SQLite database to serve as the foundation for the "Project Telemetry" testbed.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md

## Tasks

<task type="auto">
  <name>Initialize Node.js & Express</name>
  <files>
    - package.json
    - src/server.js
  </files>
  <action>
    - Initialize a new `package.json` for the backend.
    - Install `express`, `cors`, and `dotenv`.
    - Setup a basic Express server in `src/server.js` listening on port 3001.
    - Add a root healthcheck route `/api/health`.
  </action>
  <verify>node src/server.js & curl http://localhost:3001/api/health</verify>
  <done>Express server starts and serves a 200 OK from the healthcheck endpoint.</done>
</task>

<task type="auto">
  <name>Setup SQLite Database Connection</name>
  <files>
    - src/db/connection.js
  </files>
  <action>
    - Install `sqlite3` and `sqlite` (promise wrapper).
    - Create a reusable database connection instance in `src/db/connection.js` pointing to a local `telemetry.db` file.
    - Ensure the database file is generated automatically if it doesn't exist.
  </action>
  <verify>node -e "require('./src/db/connection.js')().then(db => console.log('DB Connected'))"</verify>
  <done>The application successfully creates and connects to the `telemetry.db` SQLite file.</done>
</task>

## Success Criteria
- [ ] `package.json` contains the necessary backend dependencies.
- [ ] Express server responds to HTTP requests securely.
- [ ] SQLite connection is established and the `.db` file exists.
