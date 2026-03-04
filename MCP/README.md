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

## Core Goals

By offloading context parsing to a local lightweight model and relying on Axon's precise graph context, this architecture aims to:
- **Reduce Token Usage**: The primary IDE agent receives distilled intelligence rather than raw transcripts and entire repositories.
- **Reduce System Resources**: Searching the local knowledge graph and processing text with a lightweight model is highly efficient, minimizing latency and compute overhead.
- **Reduce Number of Edits**: Structural context guides the IDE agent toward making correct substitutions without repetitive "trial-and-error" hallucinated code breakages.

## Architecture

The MCP Server is composed of:
- **Axon Graph Engine**: Runs locally to index the project and provide instantaneous structural graph queries for codebase context.
- **Resource Extractors**: Dedicated modules optimized for fetching and parsing `YouTube transcripts` and `HTML/Web documentation`.
- **Local Lightweight Model**: A small LLM running locally to distill the gathered transcripts and documentation into actionable knowledge chunks before sending it to the main agent.
- **Separate UI Component**: Ensures URL entry, context routing, and context boundary selections are managed clearly and separately from the main backend services.
