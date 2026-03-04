# Trae Code Context MCP Server

This directory contains the Local MCP (Model Context Protocol) backend for the Trae Code Context extension. The backend serves as the core intelligence engine, combining codebase structural awareness with external knowledge extraction to provide highly relevant context without context rot.

## Overview

This MCP server coordinates two primary domains of context:
1. **Codebase Intelligence**: Powered by [Axon](https://github.com/harshkedia177/axon), transforming the local codebase into a structural knowledge graph.
2. **External Knowledge Base**: Extracting and processing tutorials, documentation, and YouTube transcripts.

By marrying the exact structural impact of a code change (via the Axon knowledge graph) with user-provided external learning resources, our agent is guided to produce precise, hallucination-free edits.

## Available MCP Tools

This server exposes two specialized tool calls for the AI agent to orchestrate codebase changes and gather external knowledge:

### 1. Codebase Changes Tool
**Powered by Axon**
Instead of relying on flat text searches or full-repo grepping, this tool leverages [Axon](https://github.com/harshkedia177/axon) to understand the codebase as a structural graph. 
- Analyzes callers, callees, type dependencies, coupled files, and execution flows.
- When the user highlights a code block in the IDE UI, this tool enriches that selection with its true structural context, predicting what else will break or needs updating (using queries akin to `axon_query`, `axon_impact`, or `axon_context`).
- Ensures that code generation remains bounded to actual programmatic dependencies rather than noise.

### 2. Knowledge Base Tool
**Powered by External Extractors & Local Lightweight Model**
- Takes a user-provided URL (from a **separate UI**) pointing to a YouTube tutorial, web article, or official documentation.
- Automatically detects the source type, and extracts the transcript or text payload.
- Passes this payload to a **local, lightweight model** which distills the content and returns only the required knowledge back to the main IDE agent.
- Combines the distilled tutorial insights with the explicitly selected code and its structural graph footprint to generate accurate code suggestions.

### 3. Unified External Resource Analyzer (`analyze_external_resource`)
**Powered by Extractors + Axon KuzuBackend**
- Merges URL-based extraction with graph-aware code context in a single MCP entry point.
- Receives both a resource URL and the user-highlighted code context from the IDE.
- Verifies that highlighted code belongs to the current project graph before analysis.
- Optionally enriches the local graph by persisting resource-to-symbol relationships for future team queries.

## Security Model

To safely support URL ingestion and optional caching, the unified tool follows strict network and filesystem controls.

### 1. Network Security (SSRF Mitigation)
- **Protocol Allowlist**: Accepts only `http://` and `https://` URLs.
- **Protocol Denylist**: Rejects unsafe schemes such as `file://`, `ftp://`, and other non-web protocols.
- **Local Target Blocking**: Rejects requests to `localhost`, `127.0.0.1`, `0.0.0.0`, and private/internal network ranges.
- **Recommended Domain Allowlist (Hackathon Mode)**: Optionally restricts sources to trusted domains such as `youtube.com`, `youtu.be`, `medium.com`, `dev.to`, `github.com`, and official documentation sites.

### 2. File System Security (Workspace-Bounded I/O)
- Adopts Axon's path philosophy: storage is anchored to `Path.cwd() / ".axon" / "kuzu"`.
- Extractor-generated artifacts (cache, distilled knowledge, metadata) are bounded to a repo-local folder such as `.axon/knowledge_base/`.
- Any path traversal patterns (for example `../`) are rejected.
- No extractor-managed writes are permitted outside the active repository root.

### 3. Graph Security and Validation
- Uses direct access to Axon's `storage` (`KuzuBackend`) when integrated into `server.py`.
- Verifies highlighted code or symbol context exists in the current graph prior to processing external knowledge.
- Prevents analysis of code selections that do not belong to the indexed project.

### 4. Knowledge Graph Enrichment (Optional)
- After extracting and distilling a tutorial/resource, the tool can persist it as a node in Kuzu.
- Creates an edge from the extracted resource to the selected code symbol/function.
- Enables long-term, queryable team memory (for example: "which tutorial informed this function?").

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
