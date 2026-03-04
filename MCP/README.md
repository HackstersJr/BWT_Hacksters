# Trae Code Context MCP Server

This directory contains the Local MCP (Model Context Protocol) backend for the Trae Code Context extension. The backend serves as the core intelligence engine, combining codebase structural awareness with external knowledge extraction to provide highly relevant context without context rot.

## Node MCP (MVP)

A minimal Node.js MCP server is available at `MCP/node-mcp`.

- Entrypoint: `dist/index.js` (build from `src/index.ts`)
- Transport: stdio via `@modelcontextprotocol/sdk`
- Exposed MCP tool: `delegate_to_local_subagent`

Environment variables:
- `OPENAI_API_KEY` (optional fallback: `lm-studio`)
- `LOCAL_MODEL` (optional local model name, default: `local-model`)
- `AXON_PYTHON_CMD` (optional Python command, default: `python`)
- `AXON_REPO_ROOT` (optional repository root for Axon/RAG calls, default: current working directory)

MCP config files:
- Workspace-agnostic config: `.mcp.json` (top-level key: `mcpServers`)
- VS Code local config: `.vscode/mcp.json` (top-level key: `servers`)

## Overview

This MCP server coordinates two primary domains of context:
1. **Codebase Intelligence**: Powered by [Axon](https://github.com/harshkedia177/axon), transforming the local codebase into a structural knowledge graph.
2. **External Knowledge Base**: Extracting and processing tutorials, documentation, and YouTube transcripts.

By marrying the exact structural impact of a code change (via the Axon knowledge graph) with user-provided external learning resources, our agent is guided to produce precise, hallucination-free edits.

## Available MCP Tool Architecture

The Node MCP exposes exactly one external MCP tool to the IDE agent:

### `delegate_to_local_subagent` (external MCP tool)
- This is the only tool visible to the main IDE agent.
- Input: user prompt + highlighted code context.
- Behavior: delegates execution to a local subagent loop (LM Studio OpenAI-compatible endpoint) and returns distilled output.

### Internal tools used by the local subagent (not externally exposed)

#### Axon graph internal tools
- `axon_query`, `axon_context`, `axon_impact`, `axon_dead_code`, `axon_detect_changes`, `axon_cypher`

#### External resource / knowledge tools
- `rag_extract_resource`: extracts web docs or YouTube transcripts and persists snippets into `.axon/knowledge_base/resources.jsonl`
- `rag_query_knowledge`: retrieves relevant persisted snippets for future prompts
- `rag_store_note`: persists distilled notes linked to source URL/symbol metadata

## Tested status

Current validated paths:
- Node MCP tool registration (`delegate_to_local_subagent`)
- Axon MCP tool registration and basic calls (`axon_list_repos`)
- Direct extraction + persistence (`smoke:rag` with web URL)
- Delegate end-to-end flow through LM Studio (`/v1/chat/completions` + MCP call)

Helpful commands:
- `cd MCP/node-mcp && npm run smoke:mcp`
- `cd MCP/node-mcp && npm run smoke:rag -- https://example.com`

## Security Model

To safely support URL ingestion and optional caching, the unified tool follows strict network and filesystem controls.

### 1. Network Security (SSRF Mitigation)
- **Protocol Allowlist**: Accepts only `http://` and `https://` URLs.
- **Protocol Denylist**: Rejects unsafe schemes such as `file://`, `ftp://`, and other non-web protocols.
- **Local Target Blocking**: Rejects `localhost`, private/local IP literals, and hostnames resolving to private/local addresses (IPv4 + loopback/private/link-local IPv6 ranges).
- **Recommended Domain Allowlist (Hackathon Mode)**: Optionally restricts sources to trusted domains such as `youtube.com`, `youtu.be`, `medium.com`, `dev.to`, `github.com`, and official documentation sites.

### 2. File System Security (Workspace-Bounded I/O)
- Adopts Axon's path philosophy: storage is anchored to `Path.cwd() / ".axon" / "kuzu"`.
- Extractor-generated artifacts (cache, distilled knowledge, metadata) are bounded to a repo-local folder such as `.axon/knowledge_base/`.
- Any path traversal patterns (for example `../`) are rejected.
- No extractor-managed writes are permitted outside the active repository root.

### 3. Graph Security and Validation
- Uses direct access to Axon's `storage` (`KuzuBackend`) when integrated into `server.py`.
- `linked_symbol` metadata can be attached to persisted external knowledge.
- Strict graph-membership verification before external extraction is a planned hardening step.

### 4. Knowledge Graph Enrichment (Optional)
- Current implementation persists external knowledge in `.axon/knowledge_base/resources.jsonl` for retrieval by the subagent.
- Kuzu node/edge enrichment for external resources is optional future work.

## Core Goals

By offloading context parsing to a local lightweight model and relying on Axon's precise graph context, this architecture aims to:
- **Reduce Token Usage**: The primary IDE agent receives distilled intelligence rather than raw transcripts and entire repositories.
- **Reduce System Resources**: Searching the local knowledge graph and processing text with a lightweight model is highly efficient, minimizing latency and compute overhead.
- **Reduce Number of Edits**: Structural context guides the IDE agent toward making correct substitutions without repetitive "trial-and-error" hallucinated code breakages.

## Architecture

The MCP Server is composed of:
- **Axon Graph Engine**: Runs locally to index the project and provide instantaneous structural graph queries for codebase context.
- **Resource Extractors**: Dedicated modules optimized for fetching and parsing `YouTube transcripts` and `HTML/Web documentation`.
- **Secure URL Validation Layer**: Enforces SSRF-safe protocol/domain/network checks before any outbound request.
- **Workspace-Bounded Storage Layer**: Anchors all extractor and graph writes to repo-local `.axon/*` paths.
- **Local Lightweight Model**: A small LLM running locally to distill the gathered transcripts and documentation into actionable knowledge chunks before sending it to the main agent.
- **Kuzu Graph Enrichment Pipeline (Optional)**: Persists external resource nodes and edges linked to validated project symbols.
- **Separate UI Component**: Ensures URL entry, context routing, and context boundary selections are managed clearly and separately from the main backend services.
