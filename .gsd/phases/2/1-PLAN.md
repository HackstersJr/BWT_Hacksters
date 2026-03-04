---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: PowerShell Resource Tracker

## Objective
Create a native Windows PowerShell script that continuously monitors system resource usage (CPU and RAM) and logs it to a local CSV file. This fulfills the requirement for measuring system bloat during development.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md

## Tasks

<task type="auto">
  <name>Create Telemetry Script</name>
  <files>
    - scripts/resource_tracker.ps1
  </files>
  <action>
    - Create a directory `scripts` if it does not exist.
    - Write a PowerShell script `scripts/resource_tracker.ps1`.
    - The script should use `Get-Process` or `Get-Counter` to fetch total CPU % and Available MBytes (RAM).
    - It should loop infinitely (e.g., every 2 seconds) and append the Timestamp, CPU%, and Memory to `telemetry.csv` in the root directory.
    - Provide a way to gracefully exit or document how to stop it (e.g., Ctrl+C).
  </action>
  <verify>powershell -Command "if (Test-Path 'scripts/resource_tracker.ps1') { exit 0 } else { exit 1 }"</verify>
  <done>The `scripts/resource_tracker.ps1` file exists and contains valid PowerShell syntax.</done>
</task>

## Success Criteria
- [ ] The `resource_tracker.ps1` script is created.
- [ ] Running the script generates a valid `telemetry.csv` with Timestamp, CPU, and RAM data.
