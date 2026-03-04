
# TraeCodeContext – Combined Project Documentation

> Tutorial-aware, selection-first code analysis for TRAE IDE with a Node.js MCP server.

---

## 1. Project Overview

TraeCodeContext solves the **Overwhelmed Learner** problem by:
- Extracting tutorial context from YouTube videos and web articles.
- Combining ONLY user-selected code with tutorial content.
- Preventing context rot through strict selection-first enforcement.
- Displaying token usage and savings metrics.

**Target IDE**: TRAE IDE (VS Code compatible)  
**Backend**: Node.js MCP Server with `@modelcontextprotocol/sdk`  
**Frontend**: React-based webview UI (sidebar + manager webviews).

---

## 2. Architecture & Repository Layout

### 2.1 High-Level Architecture

```
TRAE IDE (VS Code)
│
├─ Extension Host (TypeScript)
│   ├─ TraeCodeContext Sidebar View (per-project)
│   ├─ TraeCodeContext Manager Panel (global, cross-project)
│   └─ MCP Client Bridge (stdio/child process)
│
└─ Node MCP Server (@modelcontextprotocol/sdk)
    ├─ Tools:
    │   ├─ analyze_external_resource
    │   ├─ get_history
    │   ├─ get_stats
    │   └─ bootstrap_trae_config (future)
    ├─ Services:
    │   ├─ YouTube transcript extractor
    │   └─ Web article text extractor
    └─ Storage:
        └─ Global history JSON (sessions + token stats)
```

### 2.2 Repository Structure (Target)

```
trae-code-context/
├─ extension/                     # VS Code / TRAE extension
│  ├─ src/
│  │  ├─ extension.ts            # Main activation & commands
│  │  ├─ views/
│  │  │  ├─ SidebarProvider.ts   # Per-project sidebar webview
│  │  │  └─ ManagerPanel.ts      # Global manager panel
│  │  ├─ api/
│  │  │  ├─ mcpClient.ts         # MCP client (stdio bridge)
│  │  │  └─ historyStore.ts      # Optional client-side wrapper
│  │  ├─ types/                  # Shared types
│  │  └─ utils/
│  │     ├─ selectionGuard.ts    # Selection validation logic
│  │     └─ tokenizer.ts         # Local token estimator
│  ├─ webview-ui/
│  │  ├─ sidebar/                # Sidebar UI (React)
│  │  └─ manager/                # Manager UI (React)
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ README.md
│
├─ mcp-server/                    # Node.js MCP backend
│  ├─ src/
│  │  ├─ index.ts                # MCP server entry
│  │  ├─ tools/
│  │  │  ├─ analyzeExternal.ts   # Main analysis tool
│  │  │  ├─ getHistory.ts        # History retrieval
│  │  │  └─ getStats.ts          # Stats aggregation
│  │  ├─ services/
│  │  │  ├─ youtubeExtractor.ts  # YouTube transcript service
│  │  │  ├─ webExtractor.ts      # Web article text service
│  │  │  └─ urlClassifier.ts     # URL detection
│  │  ├─ storage/
│  │  │  └─ historyStore.ts      # JSON-based history storage
│  │  └─ utils/
│  │     ├─ tokenCounter.ts      # Token estimation
│  │     └─ logger.ts            # Logging utility
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ README.md
│
├─ .trae/                         # TRAE IDE configuration
│  ├─ project_rules.md           # Project-specific AI rules
│  └─ mcp.json                   # MCP server registration
│
├─ docs/                         # Additional docs (optional if using this file)
│  └─ (...)
│
├─ ROADMAP.md                    # This combined file
└─ package.json                  # Root workspace config
```

---

## 3. Development Phases & Roadmap

### 3.1 Phase 1 – Extension Skeleton & UI (Week 1)

**Goal**: Working extension with mock data and full UI.

Tasks:

1. **Extension scaffolding**
   - TypeScript extension project.
   - `package.json`:
     - Activation events: `onStartupFinished`, `onView:traeCodeContext.sidebar`.
     - Commands:
       - `traeCodeContext.analyzeSelection`
       - `traeCodeContext.openManager`.
     - View: `traeCodeContext.sidebar` (Activity Bar).

2. **Sidebar view (webview)**
   - `SidebarProvider.ts` implements `WebviewViewProvider`.
   - React UI:
     - Tutorial URL input (YouTube or web).
     - Generate button (disabled when no selection).
     - Token stats (prompt, completion, context usage bar).
     - Result markdown panel.
     - Selection status display (lines, language).

3. **Manager panel (webview)**
   - `ManagerPanel.ts` using `createWebviewPanel`.
   - React UI:
     - Project selector.
     - Session history list (grouped by project).
     - Charts for tokens used/saved.
     - Stats overview (sessions, tokens, savings).

4. **Selection guard**
   - `selectionGuard.ts`:
     - Ensure active editor exists.
     - Ensure non-empty selection.
     - Return friendly errors.

5. **Mock data only**
   - All data comes from static mocks.
   - No MCP integration yet.

Deliverables:

- Extension runs in TRAE/VS Code.
- Sidebar & Manager work with mock data.
- UI message contracts drafted (see §4).

---

### 3.2 Phase 2 – MCP Client & IPC Bridge (Week 2)

**Goal**: Wire UI to real MCP server (stdio) via MCP client.

Tasks:

1. **MCP client (`mcpClient.ts`)**
   - Spawn MCP server as child process (`node dist/index.js`).
   - Use `@modelcontextprotocol/sdk` client.
   - Implement:
     - `analyzeExternalResource(input)`
     - `getHistory(filters?)`
     - `getStats(filters?)`
   - Handle:
     - Initialization/handshake.
     - Tool listing.
     - Timeouts and retries.
     - Clean shutdown on extension deactivation.

2. **Extension wiring**
   - `traeCodeContext.analyzeSelection`:
     - Run selection guard.
     - Extract selection text, file path, workspace root, language.
     - Prompt for tutorial URL.
     - Call MCP `analyze_external_resource`.
     - Forward result to sidebar webview.
   - Manager:
     - On open or refresh:
       - `get_history` → history list.
       - `get_stats` → global + per-project stats.

3. **History wrapper (optional)**
   - `historyStore.ts` on extension side (if needed).

Deliverables:

- Real MCP calls from extension.
- Sidebar shows real explanations + token stats.
- Manager shows real history and stats.

---

### 3.3 Phase 3 – MCP Server Core (Week 2–3)

**Goal**: Implement MCP server with extraction, token accounting, and storage.

Tasks:

1. **Server bootstrap**
   - Initialize Node + TS project.
   - Use `@modelcontextprotocol/sdk/server`.
   - Implement stdio (`StdioServerTransport`).
   - Register tools:
     - `analyze_external_resource`
     - `get_history`
     - `get_stats`.

2. **Tutorial extraction services**
   - `urlClassifier.ts`:
     - Detect YouTube vs web URLs.
   - `youtubeExtractor.ts`:
     - Parse video ID.
     - Fetch captions (via a transcript library).
     - Concatenate into plain text.
     - Fetch metadata (title, channel, duration).
   - `webExtractor.ts`:
     - Fetch HTML (e.g., `node-fetch`).
     - Parse with `cheerio` or similar.
     - Extract main article text.
     - Strip nav/ads/boilerplate.
     - Limit length.

3. **Analysis tool (`analyzeExternal.ts`)**
   - Input:
     - `tutorialUrl: string`
     - `selectedCode: string`
     - `projectRoot: string`
     - `fileName: string`
     - `language?: string`
   - Steps:
     - Classify url.
     - Extract tutorial text.
     - Run token counting (prompt & baseline).
     - Generate explanation (template-based for MVP, later via LLM).
     - Write session record to history.
   - Output:
     - `sessionId: string`
     - `explanation: string` (markdown)
     - `tokenStats: TokenStats`
     - `tutorialMetadata`
     - `timestamp`
     - `model?` (future).

4. **History & stats**
   - `historyStore.ts`:
     - JSON file: `~/.trae-code-context/history.json`.
     - Append on each analysis.
     - Filter by project/date.
   - `getHistory.ts`:
     - Filters: `projectId`, `startDate`, `endDate`, `limit`, `offset`.
   - `getStats.ts`:
     - Aggregate:
       - totalSessions, totalProjects.
       - totalPromptTokens, totalCompletionTokens.
       - totalSavedTokens, averageSavedPercent.
     - Per-project breakdown.

Deliverables:

- MCP server runs via stdio.
- Tools return correct structures.
- Docs: MCP API spec + token accounting complete.

---

### 3.4 Phase 4 – TRAE Integration & Polish (Week 3–4)

**Goal**: Ship a TRAE-native experience.

Tasks:

1. **TRAE configuration**
   - `.trae/mcp.json`:
     - Register `trae-code-context` server.
     - Provide `command`, `args`, `env`.
   - `.trae/project_rules.md`:
     - Selection-first rules.
     - Tutorial-aware usage patterns.
     - When to call MCP tools.

2. **Integration guide**
   - Document:
     - Installing extension.
     - Building & configuring MCP server.
     - Setting `.trae` config.
     - Attaching to TRAE agents.

3. **Optional: auto-bootstrap**
   - `bootstrap_trae_config` MCP tool:
     - Generates `.trae` files.
   - Extension command to call it.

4. **UI polish**
   - Theme-aware styling.
   - Improved loading and error handling.
   - Accessibility: keyboard nav, ARIA labels.
   - Refined token visualization.

5. **End-to-end testing**
   - Real YouTube + web URLs.
   - Different project types.
   - Large selections.
   - Many history entries.

Deliverables:

- `.trae` templates working.
- Integration guide.
- Polished UX.
- E2E tests passing.

---

### 3.5 Phase 5 – LLM Integration & Advanced Features (Post-MVP)

**Goal**: Real tutorial-aware AI explanations and advanced context features.

Tasks:

1. **LLM integration**
   - Add Claude/GPT clients.
   - Prompt templates:
     - System: tutorial-aware analysis instructions.
     - User: selected code + tutorial summary.
   - Streaming responses (optional).

2. **Advanced context**
   - Optionally add `.trae/project_rules.md` content into prompt.
   - Multi-file context with user opt-in.
   - Project docs (if available).

3. **Export & sharing**
   - Export sessions as markdown/JSON.
   - Import across machines.
   - Team sharing.

4. **Analytics**
   - Enhanced charts:
     - Time-series tokens.
     - Tutorial frequency.
     - Per-developer stats.

Deliverables:

- Real LLM-based explanations.
- Optional advanced context strategies.
- Export/import features.
- Rich analytics.

---

## 4. UI–Extension Contracts (Summary)

> Detailed message schemas can live elsewhere; this is the condensed spec.

### 4.1 Sidebar → Extension (Webview → Host)

- `ready` – sidebar loaded.
- `requestAnalyze`:
  - `{ tutorialUrl: string }`
- `openManager` – ask host to open Manager panel.

### 4.2 Extension → Sidebar

- `selectionStatus`:
  - `{ hasSelection: boolean, languageId?: string, lines?: number }`
- `analysisResult`:
  - `{ sessionId, explanation, tokenStats, tutorialMetadata, timestamp }`
- `analysisError`:
  - `{ code, message, details? }`

### 4.3 Manager → Extension

- `requestRefreshHistory`:
  - `{ projectId?, startDate?, endDate? }`
- `openProject`:
  - `{ projectId }`
- `exportSessions`:
  - `{ format: 'json' | 'csv' }`

### 4.4 Extension → Manager

- `historyData`:
  - `{ sessions: SessionSummary[], stats: StatsSummary }`
- `historyError`:
  - `{ code, message, details? }`

---

## 5. MCP API Specification (Summary)

### 5.1 Tool: `analyze_external_resource`

**Purpose**: Analyze selected code using context extracted from a tutorial URL (YouTube or web).

**Input:**

```ts
interface AnalyzeExternalResourceInput {
  tutorialUrl: string;
  selectedCode: string;
  projectRoot: string;
  fileName: string;
  language?: string;
}
```

**Output:**

```ts
interface AnalyzeExternalResourceOutput {
  sessionId: string;
  explanation: string;
  tokenStats: TokenStats;
  tutorialMetadata: {
    url: string;
    sourceType: 'youtube' | 'web';
    title?: string;
    author?: string;
    publishDate?: string;
    duration?: number; // seconds, for YouTube
  };
  timestamp: string; // ISO 8601
  model?: string;
}
```

Errors:

- `INVALID_URL`
- `EXTRACTION_FAILED`
- `TUTORIAL_TOO_LONG`
- `INVALID_CODE`
- `STORAGE_ERROR`
- `TOKENIZATION_ERROR`

---

### 5.2 Tool: `get_history`

**Purpose**: Retrieve analysis history.

**Input (filters):**

```ts
interface GetHistoryInput {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'savedTokens' | 'promptTokens';
  sortOrder?: 'asc' | 'desc';
}
```

**Output:**

```ts
interface GetHistoryOutput {
  sessions: SessionSummary[];
  totalCount: number;
  filters: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
  };
}
```

---

### 5.3 Tool: `get_stats`

**Purpose**: Aggregate token stats globally and per project.

**Input:**

```ts
interface GetStatsInput {
  projectId?: string;
  startDate?: string;
  endDate?: string;
}
```

**Output:**

```ts
interface GetStatsOutput {
  global: {
    totalSessions: number;
    totalProjects: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalSavedTokens: number;
    averageSavedPercent: number;
  };
  byProject: Array<{
    projectId: string;
    projectName: string;
    sessionCount: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalSavedTokens: number;
    averageSavedPercent: number;
    lastSessionAt?: string;
  }>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}
```

---

## 6. Token Accounting (Core Logic)

### 6.1 Concepts

- **Token**: smallest unit processed by models (roughly ¾ of a word).
- **Context window**: max tokens per request (prompt + completion).
- **Prompt tokens**: input tokens (system, instructions, code, tutorial).
- **Completion tokens**: output tokens (model reply).
- **Baseline**: tokens used if entire file (or more) were sent.
- **Saved tokens**: baseline − actual prompt tokens.

### 6.2 Basic Formulas

- `TotalTokens = PromptTokens + CompletionTokens`
- `SavedTokens = BaselinePromptTokens − PromptTokens`
- `SavedPercent = (SavedTokens / BaselinePromptTokens) × 100`
- `ContextUsedPercent = (TotalTokens / ContextWindow) × 100`

### 6.3 TokenCounter (pseudo-TS)

```ts
export class TokenCounter {
  constructor(model: string = 'cl100k_base') { /* init tokenizer */ }

  count(text: string): number { /* encode & length */ }

  countMultiple(texts: string[]): number {
    return this.count(texts.join('\n\n'));
  }
}
```

Baseline strategy (current):

- Baseline uses full file text instead of only the selection.

---

## 7. Development Setup (Condensed)

### 7.1 Prerequisites

- Node.js ≥ 18
- npm ≥ 8
- TRAE IDE (VS Code compatible)
- Git (optional if you sync manually)

### 7.2 Setup Commands

```bash
# Root
npm install

# Extension
cd extension
npm install
npm run compile   # or npm run watch

# MCP server
cd ../mcp-server
npm install
npm run build
node dist/index.js   # test standalone
```

### 7.3 Debugging

- Extension:
  - Open `extension/` in TRAE.
  - Press F5 to start Extension Development Host.
- Webview:
  - Right-click → Inspect → use DevTools console.
- MCP server:
  - `node --inspect-brk dist/index.js`
  - Attach Chrome DevTools.

---

## 8. TRAE Integration & Rules

### 8.1 `.trae/mcp.json` (Example)

```json
{
  "mcpServers": {
    "trae-code-context": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "HISTORY_FILE": "~/.trae-code-context/history.json",
        "MAX_TUTORIAL_LENGTH": "50000"
      }
    }
  }
}
```

Update the path to your built MCP server.

### 8.2 Project Rules (Selection-First)

Key rules:

- ALWAYS operate on user-selected code.
- NEVER auto-scan the entire repo unless explicitly requested.
- Use TraeCodeContext MCP when user references a tutorial URL.
- Always show token stats (prompt, completion, total, saved %).

Recommended analysis response structure:

```markdown
# Code Analysis

[Explain what the selected code does]

## Tutorial Context

[Summarize relevant parts of the tutorial]

## How This Code Relates to the Tutorial

[Connect tutorial concepts to the code]

## Recommendations

- [Improvements and best practices]

## Token Usage

- Prompt: X tokens
- Completion: Y tokens
- Total: Z tokens
- Saved: S tokens (P% vs full file)
```

---

## 9. Extension Behavior (Summary)

- Sidebar:
  - URL input, selection guard, Generate button, token stats, markdown result.
- Manager:
  - History list, filters, charts, export.
- Commands:
  - `TraeCodeContext: Analyze Selection`
  - `TraeCodeContext: Open Manager`

---

## 10. Contribution Guidelines (Condensed)

- Use feature branches (e.g., `feature/sidebar-token-bar`).
- Commit messages: `type(scope): message`.
- Run tests (`npm test`) and linters before PR.
- Update docs when changing behavior.
- Target ≥ 70% coverage for new code.

---

## 11. Quick Start Checklist

**For you right now:**

1. Save this file as `ROADMAP.md` in your project root.
2. Build skeleton extension (Phase 1) with mock data.
3. Implement MCP server skeleton (Phase 3 basics).
4. Wire extension ↔ MCP (Phase 2).
5. Add `.trae/mcp.json` and simple rules file using the snippets above.
6. Use this single file as the main “context doc” for your AIs.
