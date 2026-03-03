# Trae Code Context MCP Server and UI Extension
VisionX Hackathon Project by Team Hacksters

## Overview
This project solves the Overwhelmed Learner problem by combining:
- A local MCP backend that extracts tutorial context from external resources
- A sidebar-driven IDE extension that sends only explicitly selected code to analysis flow

The core design prevents context rot by avoiding broad codebase scraping and limiting AI input to user-approved code context.

## Problem Statement
Developers learning from YouTube videos and web tutorials often get weak or hallucinated AI help because assistants search too much unrelated code.  
This causes:
- Context rot in large repositories
- Noisy or irrelevant suggestions
- Higher token usage and unstable outputs

## Solution
This extension introduces a controlled context pipeline:
- User highlights a specific code block
- User provides a tutorial URL in the sidebar
- The backend extracts tutorial text
- The analysis flow works only on selected code plus extracted tutorial content

No full-project scan is required for the core workflow.

## Architecture
The system has two coordinated parts:

### 1) MCP Backend
Responsibilities:
- Parse tutorial URL input
- Detect YouTube vs web article source
- Extract transcript or article text
- Expose extraction via MCP tool endpoint

Main modules:
- Data extractors for YouTube transcript and web text parsing
- MCP server with analyze_external_resource style tool registration

### 2) IDE Extension and Sidebar UI
Responsibilities:
- Provide a sidebar to paste tutorial URL
- Trigger analyze action from UI button
- Enforce anti-context-rot rule (selection-first behavior)
- Pass selected code context plus external text into downstream generation/saving flow

## Anti-Context-Rot Design
The extension enforces explicit context boundaries:
- Preferred path: highlighted selection only
- No automatic whole-repo search
- User remains in control of every code block sent for analysis

This keeps outputs relevant, grounded, and easier to trust.

## Expected Workflow
1. Open file in editor  
2. Highlight exact code block to analyze  
3. Enter tutorial URL in sidebar  
4. Click Generate Insight  
5. Backend extracts tutorial context and combines with selected code for explanation generation

## Technology Stack
- Node.js runtime
- TypeScript
- Model Context Protocol SDK
- YouTube transcript extraction
- HTML text extraction with HTTP fetch and parser
- VS Code style Webview sidebar API

## Repository Structure (Target)
- src for extension and backend logic
- src/services for extractor services
- webviews for sidebar UI
- docs for architecture assets
- knowledge-base output folder for generated notes (optional MVP output path)

## Architecture Diagram
Add the diagram image to this repository and reference it below.

![Architecture Diagram](docs/architecture-diagram.png)

Suggested diagram content:
- Sidebar UI
- Selection guard
- Command bridge
- MCP server tool
- YouTube and Web extractors
- Output handoff to explanation or knowledge-base module

## Why This Matters
This project gives hackathon teams a practical edge:
- Better signal-to-noise in AI explanations
- Lower hallucination risk
- Faster onboarding in unfamiliar codebases
- Clear user-controlled context boundaries

## Hackathon Goal Alignment
This implementation directly addresses:
- Context rot
- Redundant search behavior
- Noisy assistant outputs in large projects

It is designed to be local-first, reproducible, and demo-friendly for VisionX judging.
