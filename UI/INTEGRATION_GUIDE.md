# TraeCodeContext — Backend Integration Guide

> **Audience:** MCP Backend Developers  
> **Scope:** This guide covers the **one file** you need to edit (`mcpClient.ts`) and nothing else.  
> **Last Updated:** March 2026

---

## 1. Architecture — How Messages Flow

```
  User action                    Extension Host                 Your code
 ┌──────────┐   postMessage   ┌──────────────────┐   call    ┌──────────────┐
 │ Sidebar   │ ──────────────▸│ SidebarProvider   │ ────────▸│              │
 │ React App │◂────────────── │   .ts             │◂──────── │ mcpClient.ts │
 └──────────┘  analyzeResponse└──────────────────┘  return   │              │
                                                              │  analyze-    │
 ┌──────────┐   postMessage   ┌──────────────────┐   call    │  Tutorial()  │
 │ Manager   │ ──────────────▸│ ManagerPanel.ts   │ ────────▸│              │
 │ React App │◂────────────── │                    │◂──────── │  getGlobal-  │
 └──────────┘   historyData   └──────────────────┘  return   │  History()   │
                                                              └──────────────┘
```

**Key point:** The React UIs never call the backend directly. They send JSON messages to the Extension Host providers, which call `mcpClient.ts`, get results, and post them back. You only edit `mcpClient.ts`.

---

## 2. Setup & Build

```bash
# 1. Navigate to the UI folder
cd BWT_Hacksters/UI

# 2. Install all dependencies (extension host + both webview UIs)
npm install
cd webview-ui/sidebar && npm install && cd ../manager && npm install && cd ../..

# 3. Build everything in one command
npm run build:all

# 4. Press F5 in VS Code to launch the Extension Development Host
```

| Script | What it does |
|---|---|
| `npm run compile` | Compiles extension host TypeScript → `out/` |
| `npm run watch` | Watch-mode compilation for dev |
| `npm run build:sidebar` | Builds the Sidebar React app → `webview-ui/sidebar/dist/` |
| `npm run build:manager` | Builds the Manager React app → `webview-ui/manager/dist/` |
| `npm run build:all` | Runs `build:sidebar` + `build:manager` + `compile` sequentially |

---

## 3. The Integration Point — `src/services/mcpClient.ts`

This file exports **two async functions**. Both currently return mock data. Replace the function bodies with real MCP SDK calls. Do **not** change the return types.

### 3a. `analyzeTutorial(url, selectedCode) → AnalyzeResult`

**When it runs:** User pastes a tutorial URL, selects code in the editor, clicks "Generate Insight" in the Sidebar.

```typescript
export interface AnalyzeResult {
  /** Human-readable context insight displayed in the Sidebar */
  context: string;
  /** Number of tokens saved by including the code selection */
  tokensSaved: number;
}
```

**Error handling:** Throw a standard `Error`. The SidebarProvider catches it and displays the error message in the UI.

### 3b. `getGlobalHistory() → ManagerData`

**When it runs:** User opens the Manager panel *or* clicks the "Refresh" button. Filters are applied client-side — return the full dataset.

```typescript
export interface ManagerData {
  sessions: SessionSummary[];
  global: GlobalStats;
}

export interface SessionSummary {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;       // ISO 8601
  fileName: string;
  codeSummary: string;
  tutorialUrl: string;
  tokenStats: TokenStats;
}

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  savedTokens: number;
  savedPercent: number;     // 0–100
}

export interface GlobalStats {
  totalSessions: number;
  totalProjects: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalSavedTokens: number;
  averageSavedPercent: number;
}
```

---

## 4. Message Contracts (Reference Only)

You do **not** need to modify any messages — the providers handle serialization automatically. This section exists for debugging.

### Sidebar Messages

| Direction | `type` | Payload Schema |
|---|---|---|
| UI → Host | `analyzeRequest` | `{ url: string }` |
| Host → UI | `analyzeResponse` | `{ context: string, tokensSaved: number }` |
| Host → UI | `analyzeError` | `{ message: string }` |
| Host → UI | `selectionChange` | `{ hasSelection: boolean }` |
| UI → Host | `openManager` | *(no payload)* |

### Manager Messages

| Direction | `type` | Payload Schema |
|---|---|---|
| UI → Host | `requestRefreshHistory` | `{ projectId?: string, startDate?: string, endDate?: string }` |
| Host → UI | `historyData` | `ManagerData` (full object, see §3b) |
| Host → UI | `historyError` | `{ code: string, message: string }` |
| UI → Host | `exportSessions` | `{ format: 'json' \| 'csv' }` |

---

## 5. Testing & Debugging

1. Edit **only** `src/services/mcpClient.ts`.
2. Run `npm run compile` (or keep `npm run watch` running).
3. Press **F5** → Extension Development Host launches.
4. **Sidebar test:** open the sidebar from the activity bar, select code in the editor, paste a URL, click "Generate Insight".
5. **Manager test:** open Command Palette → `TraeCodeContext: Open History & Stats Manager`, verify stats cards and table populate.
6. **Errors:** check VS Code's **Output** panel → select **"Extension Host"** from the dropdown.

### Common Issues

| Symptom | Fix |
|---|---|
| Sidebar shows "No code selected" | Highlight at least one character in an open editor |
| Manager table is empty | Ensure `getGlobalHistory()` returns at least one session |
| Webview blank after code change | Rebuild: `npm run build:all`, then reload the Extension Host |
| CSP errors in devtools console | Do not add external script/style URLs — all assets are local |

---

## 6. File Map

```
UI/
├── package.json                    ← Extension manifest + build scripts
├── tsconfig.json                   ← TypeScript config (extension host)
├── src/
│   ├── extension.ts                ← Activation: registers providers + commands
│   ├── providers/
│   │   └── SidebarProvider.ts      ← WebviewViewProvider — calls mcpClient
│   ├── panels/
│   │   └── ManagerPanel.ts         ← WebviewPanel singleton — calls mcpClient
│   └── services/
│       └── mcpClient.ts            ← ★ YOUR INTEGRATION POINT ★
├── webview-ui/
│   ├── sidebar/                    ← Sidebar React app (pre-built in dist/)
│   │   └── dist/assets/            ← index.js + index.css (deterministic names)
│   └── manager/                    ← Manager React app (pre-built in dist/)
│       └── dist/assets/            ← index.js + index.css (deterministic names)
├── media/
│   └── traecodecontext.svg         ← Activity bar icon
└── .vscode/
    ├── launch.json                 ← F5 config (preLaunchTask = build:all)
    └── tasks.json                  ← Build task definition
```
