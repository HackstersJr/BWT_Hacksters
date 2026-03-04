# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0

## Must-Haves (from SPEC)
- [ ] Functional ERP environment (Auth, Employee Directory, Leave Management, Asset Tracker)
- [ ] PowerShell script logging CPU/RAM to a local CSV
- [ ] LLM token logging wrapper capturing `prompt_tokens` and `completion_tokens` to JSON/CSV
- [ ] Basic static analysis for code quality baseline
- [ ] Clean and basic Tailwind CSS frontend

## Phases

### Phase 1: Foundation (Backend & Database)
**Status**: ⬜ Not Started
**Objective**: Setup the Express.js API, SQLite schema, and basic structure for the ERP core features (Users, Leaves, Assets). Role-Based Access Control logic starts here.

### Phase 2: Telemetry Tools (Scripting & LLM Wrapper)
**Status**: ⬜ Not Started
**Objective**: Develop the native PowerShell script to pull CPU/RAM usage to CSV, and create the middleware wrapper for logging token payloads.

### Phase 3: Frontend Scaffolding (React + Vite + Tailwind)
**Status**: ⬜ Not Started
**Objective**: Connect the React frontend to the backend. Establish routing, basic UI layout, and the Auth layer (Admin, HR, Employee).

### Phase 4: Core ERP Features
**Status**: ⬜ Not Started
**Objective**: Build out the specific forms and CRUD interfaces. Implement the Employee Directory, Leave Management requests/approvals, and the Asset Tracker items list.

### Phase 5: Polish & Static Analysis setup
**Status**: ⬜ Not Started
**Objective**: Add the static analysis tooling to establish a baseline. Run the full setup via a combined start script to test the happy path locally.
