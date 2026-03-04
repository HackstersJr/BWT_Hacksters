# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Project Telemetry is a lightweight ERP testbed designed strictly for internal benchmarking. Its purpose is to measure the overhead, speed, and efficiency of AI-assisted development by tracking LLM token efficiency, system resource bloat (CPU/RAM spikes), and baseline code quality.

## Goals
1. Provide a functional "happy path" ERP environment (Auth, Employee Directory, Leave Management, Asset Tracker) as a testing ground.
2. Track system resource usage (CPU/RAM) continuously via a native Windows PowerShell script to a local CSV.
3. Track LLM interaction efficiency by wrapping standard REST API calls (e.g., OpenAI/Anthropic payloads) to log `prompt_tokens` and `completion_tokens` to a local file.
4. Establish baseline code quality metrics via static analysis.

## Non-Goals (Out of Scope)
- Production-ready robustness or handling of complex edge cases in the ERP features.
- Commit and line-edit tracking (no Git hooks).
- Deployment to cloud infrastructure (runs locally on Windows).
- Complex UI/UX (clean, basic Tailwind styling is sufficient).

## Users
Internal developers and researchers conducting benchmarking of AI coding assistants.

## Constraints
- **OS**: Windows (PowerShell for system tracking).
- **Frontend**: React built with Vite, styled with Tailwind CSS.
- **Backend**: Express.js REST API with SQLite database (flat, straightforward architecture).
- **LLM Logging**: Intercept and log tokens from standard REST API payloads.

## Success Criteria
- [ ] ERP features (Auth, Directory, Leave, Assets) are functional for testing happy paths.
- [ ] A PowerShell script successfully logs CPU/RAM usage to a CSV during development sessions.
- [ ] An LLM wrapper successfully intercepts and logs token usage to a local JSON/CSV file.
- [ ] Static analysis tools can successfully measure baseline code quality of the testbed.
