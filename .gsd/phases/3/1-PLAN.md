---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: MCP Telemetry Integration

## Objective
Implement native system tracking for Windows to monitor CPU/RAM resource overhead, and a standalone TypeScript utility to track LLM token usage inside the MCP Server architecture. These tools are specifically targeted for the VisionX Hackathon benchmarks.

## Context
- .gsd/ROADMAP.md

## Tasks

<task type="auto">
  <name>Create Windows System Resource Monitor</name>
  <files>
    - scripts/monitor.ps1
  </files>
  <action>
    - Create a directory `scripts` if it does not exist.
    - Write a simple PowerShell script `scripts/monitor.ps1`.
    - Loop infinitely with a 3-second delay (`Start-Sleep -Seconds 3`).
    - Fetch total CPU % (using `Get-Counter '\Processor(_Total)\% Processor Time'`) and Available RAM in MB (`Get-Counter '\Memory\Available MBytes'`).
    - Append the Timestamp, CPU %, and Available RAM to `system_metrics.csv` in the project root.
    - Ensure it is extremely lightweight so it doesn't skew the benchmarks.
  </action>
  <verify>powershell -Command "if (Test-Path 'scripts/monitor.ps1') { exit 0 } else { exit 1 }"</verify>
  <done>The `scripts/monitor.ps1` file exists and has valid PowerShell syntax.</done>
</task>

<task type="auto">
  <name>Create Standalone Token Logging Utility</name>
  <files>
    - src/utils/telemetry.ts
  </files>
  <action>
    - Create a directory `src/utils` if it does not exist.
    - Write a TypeScript module `src/utils/telemetry.ts`.
    - Export an asynchronous function `logTokenUsage(promptTokens: number, completionTokens: number, source: string)`.
    - Use the native Node.js `node:fs/promises` module to handle file operations.
    - The function should append a JSON record (including a timestamp) to an array in `token_logs.json` in the project root.
    - If the file doesn't exist, it should gracefully create and seed it as an array.
  </action>
  <verify>npx tsc --noEmit src/utils/telemetry.ts</verify>
  <done>The `src/utils/telemetry.ts` file compiles cleanly via TypeScript.</done>
</task>

## Success Criteria
- [ ] `scripts/monitor.ps1` correctly outputs Timestamp, CPU, and RAM to `system_metrics.csv`.
- [ ] `src/utils/telemetry.ts` safely appending valid JSON objects to `token_logs.json`.
- [ ] Both implementations use lightweight/native dependencies (no express overhead).
