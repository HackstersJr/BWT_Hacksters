---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: LLM Token Logging Middleware

## Objective
Create an Express.js middleware function that intercepts standard REST API calls mimicking common LLM endpoints (like OpenAI or Anthropic) and logs their `prompt_tokens` and `completion_tokens` to a local JSON file.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- src/server.js

## Tasks

<task type="auto">
  <name>Create the Token Logger Middleware</name>
  <files>
    - src/middleware/telemetry.js
  </files>
  <action>
    - Intercept `res.send` or `res.json` to inspect the response payload before it's sent to the client.
    - Check if the payload contains standard usage stats (e.g., `usage.prompt_tokens` and `usage.completion_tokens`).
    - If found, append the timestamp, endpoint url, and token counts to a local file `telemetry_tokens.json`.
    - If `telemetry_tokens.json` doesn't exist, create it as an array and push new records.
  </action>
  <verify>node -e "require('./src/middleware/telemetry.js'); console.log('Telemetry Middleware loaded')"</verify>
  <done>Middleware correctly exposes a function and can be loaded by Node.js.</done>
</task>

<task type="auto">
  <name>Implement Mock LLM Route and Apply Middleware</name>
  <files>
    - src/routes/llm.js
    - src/server.js
  </files>
  <action>
    - Create a mock route `/api/llm/generate` in `src/routes/llm.js` that simulates an LLM response containing a `usage` object (e.g., `{ prompt_tokens: 15, completion_tokens: 30 }`).
    - Mount `src/routes/llm.js` on `/api/llm` in `src/server.js`.
    - Apply the `telemetry` middleware only to the `/api/llm` routes.
  </action>
  <verify>node src/server.js & curl -X POST -H 'Content-Type: application/json' -d '{"prompt":"hello"}' http://localhost:3001/api/llm/generate</verify>
  <done>Curl command succeeds and generates an entry in `telemetry_tokens.json`.</done>
</task>

## Success Criteria
- [ ] Making a POST request to `/api/llm/generate` successfully writes to `telemetry_tokens.json`.
- [ ] The `telemetry_tokens.json` structure properly stores prompt and completion counts along with a timestamp.
