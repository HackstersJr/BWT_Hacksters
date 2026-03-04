# Implementation README — Node MCP + Axon Bridge

## What was implemented

### 1) Node MCP single-tool server (MVP)
- Implemented a minimal Node MCP server that exposes exactly one external MCP tool:
  - `delegate_to_local_subagent`
- Tool input contract:
  - `user_prompt` (required)
  - `highlighted_code` (required)
  - `highlighted_symbol` (optional)
  - `max_iterations` (optional, clamped)
- MCP transport: stdio (`@modelcontextprotocol/sdk`).

### 2) LM Studio orchestrator loop inside Node MCP
- Added an internal orchestration loop (OpenAI-compatible API pointed at LM Studio):
  - `baseURL`: `http://localhost:1234/v1`
  - model from `LOCAL_MODEL` (default `local-model`)
- Loop behavior:
  - iterative tool-calling up to `max_iterations` (default 6, max 10)
  - assistant/tool message chaining per iteration
  - exits early when model returns final text with no tool calls
- Internal tools available to the LLM (not externally exposed as MCP tools):
  - `axon_query`, `axon_context`, `axon_impact`, `axon_dead_code`, `axon_detect_changes`, `axon_cypher`

### 3) Python Axon backend bridge for Node orchestration
- Implemented strict JSON bridge CLI at `axon.subagent_backend`.
- Node side calls Python via subprocess:
  - `python -m axon.subagent_backend run-tool <tool> --stdin-args`
- Bridge loads Axon Kuzu DB from repo-local path:
  - `<repo_root>/.axon/kuzu`
- Supported bridge tools:
  - `axon_query`, `axon_context`, `axon_impact`, `axon_dead_code`, `axon_detect_changes`, `axon_cypher`

### 4) Hardening / security changes
- Input validation and bounds:
  - max lengths for prompt/code/symbol/cypher/diff/json args
  - integer clamping for `limit`, `depth`, `max_iterations`
- Process hardening:
  - subprocess timeout + output caps + strict JSON parsing
  - OpenAI call timeout guard
- Tool allowlisting:
  - Node internal dispatch only permits explicit Axon tool set
- Cypher safety:
  - Axon `handle_cypher` rejects write-like keywords (`CREATE`, `DELETE`, `SET`, `MERGE`, etc.)
  - read-only query intent enforced at handler level

---

## Files added/updated

### Node MCP
- `MCP/node-mcp/src/index.ts`
  - external MCP tool registration
  - LM Studio orchestration loop
  - internal Axon tool dispatch + Python bridge subprocess integration
  - validation/timeouts/tool allowlist
- `MCP/node-mcp/package.json`
  - scripts: `build`, `start`, `build-and-start`, `smoke:mcp`
  - dependencies for MCP SDK + OpenAI client
- `MCP/node-mcp/scripts/mcp-smoke-test.mjs`
  - stdio smoke tests for Node MCP and Axon MCP discoverability/callability

### Axon bridge + MCP integration points
- `MCP/axon/src/axon/subagent_backend.py`
  - strict JSON CLI backend used by Node MCP
- `MCP/axon/src/axon/mcp/server.py`
  - Axon MCP server tools/resources entrypoint (used by smoke tests and direct clients)
- `MCP/axon/src/axon/mcp/tools.py`
  - tool handlers including read-only Cypher guard

### Project-level discoverability config
- `.mcp.json`
  - local MCP server registration for both `node-delegate` and `axon`

### Supporting docs
- `MCP/README.md`
  - Node MCP MVP + environment variable notes

---

## Entry points

### External entry points (MCP clients / IDE integration)
- Node MCP server:
  - command: `npm run build-and-start`
  - cwd: `MCP/node-mcp`
  - exposed tool: `delegate_to_local_subagent`
- Axon MCP server:
  - command: `../../.venv/bin/python -m axon.mcp.server`
  - cwd: `MCP/axon`
  - `PYTHONPATH=src`

### Internal entry points
- Node orchestrator function:
  - `delegateToLocalSubagent(...)` in `MCP/node-mcp/src/index.ts`
- Python bridge command:
  - `python -m axon.subagent_backend run-tool ...`
- Axon MCP dispatch:
  - `call_tool(...)` in `MCP/axon/src/axon/mcp/server.py`

---

## MCP discoverability config (`.mcp.json`)

Current project-root config:

```json
{
  "mcpServers": {
    "node-delegate": {
      "command": "npm",
      "args": ["run", "build-and-start"],
      "cwd": "MCP/node-mcp",
      "env": {
        "AXON_PYTHON_CMD": "./.venv/bin/python",
        "AXON_REPO_ROOT": "../..",
        "PYTHONPATH": "../axon/src"
      }
    },
    "axon": {
      "command": "../../.venv/bin/python",
      "args": ["-m", "axon.mcp.server"],
      "cwd": "MCP/axon",
      "env": {
        "PYTHONPATH": "src"
      }
    }
  }
}
```

---

## Smoke test (without LM Studio)

### Command
From `MCP/node-mcp`:

```bash
npm run smoke:mcp
```

### Result snapshot (latest run)
- Overall: `ok: true`
- Node check: `delegate_to_local_subagent` is listed
- Axon check: Axon tools are listed and `axon_list_repos` call succeeded
- Exit status: success (`0`)

### Why this works without LM Studio
- Smoke test validates MCP server startup + tool discovery + a safe Axon tool call.
- It does **not** invoke the delegate tool’s full LLM generation path by default, so LM Studio is not required for this registration smoke test.

---

## Context DB structure summary

- Storage backend: Kuzu (`KuzuBackend`)
- Default repo-local DB path expected by bridge/server:
  - `<repo_root>/.axon/kuzu`
- Node tables (from `NodeLabel`):
  - `File`, `Folder`, `Function`, `Class`, `Method`, `Interface`, `TypeAlias`, `Enum`, `Community`, `Process`
- Embedding table:
  - `Embedding(node_id, vec)`
- Relationship table group:
  - `CodeRelation` across all node-table pairs
  - relation properties include: `rel_type`, `confidence`, `role`, `step_number`, `strength`, `co_changes`, `symbols`
- FTS indexes:
  - created per node table over `name`, `content`, `signature`

---

## Environment variables and run instructions

### Environment variables
- Node MCP runtime:
  - `OPENAI_API_KEY` (optional; defaults to `lm-studio`)
  - `LOCAL_MODEL` (optional; default `local-model`)
  - `AXON_PYTHON_CMD` (optional; default `python`)
  - `AXON_REPO_ROOT` (optional; default current working directory)
- Smoke script helper:
  - `AXON_PYTHON` (optional; default `<workspace>/.venv/bin/python`)

### Run instructions
1. Axon Python env ready (from repo root):
   - ensure Python can import `axon` and Axon MCP server can run
2. Start via MCP client using `.mcp.json`, or run manually:
   - Node MCP:
     - `cd MCP/node-mcp && npm run build-and-start`
   - Axon MCP:
     - `cd MCP/axon && PYTHONPATH=src ../../.venv/bin/python -m axon.mcp.server`
3. Smoke test:
   - `cd MCP/node-mcp && npm run smoke:mcp`

---

## Known limitations / next steps

- LM Studio dependency remains for full delegate execution path (`http://localhost:1234/v1`).
- Bridge supports a curated internal tool subset (not every Axon MCP tool).
- If `<repo_root>/.axon/kuzu` is missing, bridge tool calls fail with `index_not_found`.
- Current smoke test is discoverability-focused; add a gated end-to-end delegate test (with LM Studio running) for full orchestration validation.
- Optionally align bridge + Axon MCP tool surface if `axon_list_repos` is desired in internal orchestration.
