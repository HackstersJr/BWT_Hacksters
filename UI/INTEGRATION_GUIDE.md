# TraeCodeContext — Backend Integration Guide

> **Audience:** MCP Backend Developers  
> **Last Updated:** March 2026

---

## 1. Quick Start

```bash
# 1. Clone the repo and navigate to the UI folder
cd BWT_Hacksters/UI

# 2. Install extension host dependencies
npm install

# 3. Install React webview dependencies
cd webview-ui/sidebar && npm install && cd ../manager && npm install && cd ../..

# 4. Build everything (webviews + extension host) in one command
npm run build:all

# 5. Open VS Code, press F5 to launch the Extension Development Host
#    — The Sidebar appears in the Activity Bar (left icon)
#    — The Manager opens via Command Palette → "TraeCodeContext: Open History & Stats Manager"
```

### Script Reference

| Script | Command | Purpose |
|---|---|---|
| `npm run compile` | `tsc -p ./` | Compile extension host TypeScript → `out/` |
| `npm run watch` | `tsc -watch -p ./` | Watch-mode compilation for dev |
| `npm run build:all` | Builds sidebar + manager + extension | Full production build |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     VS Code Host                         │
│                                                          │
│  ┌────────────────┐         ┌─────────────────────────┐  │
│  │  extension.ts  │─────────│  SidebarProvider.ts     │  │
│  │  (activation)  │         │  (WebviewViewProvider)   │  │
│  └──────┬─────────┘         └──────────┬──────────────┘  │
│         │                              │                  │
│         │ registers command            │ postMessage ↕    │
│         ▼                              ▼                  │
│  ┌─────────────────┐         ┌─────────────────────┐     │
│  │ ManagerPanel.ts │         │ Sidebar React App   │     │
│  │ (WebviewPanel)  │         │ (webview-ui/sidebar) │     │
│  └──────┬──────────┘         └─────────────────────┘     │
│         │ postMessage ↕                                   │
│         ▼                                                 │
│  ┌─────────────────────┐                                  │
│  │ Manager React App   │                                  │
│  │ (webview-ui/manager)│                                  │
│  └─────────────────────┘                                  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                 mcpClient.ts                         │ │
│  │  ✦ analyzeTutorial(url, selectedCode)               │ │
│  │  ✦ getGlobalHistory()                               │ │
│  │                                                     │ │
│  │  ⬆ THIS IS THE ONLY FILE YOU NEED TO EDIT ⬆        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Key principle:** The React UIs are **dumb presentation layers**. They send simple JSON messages to the Extension Host, which calls `mcpClient.ts`, gets results, and posts them back. The React apps never call the backend directly.

---

## 3. Where to Add Backend Logic

### File: `src/services/mcpClient.ts`

This is the **single integration point**. It exports two async functions:

### `analyzeTutorial(url: string, selectedCode: string): Promise<AnalyzeResult>`

Called when the user clicks **"Generate Insight"** in the Sidebar.

- **Input:** The tutorial URL + the code the user highlighted in the editor.
- **Output:** Must return an object matching:

```typescript
interface AnalyzeResult {
  context: string;      // The generated insight text shown to the user
  tokensSaved: number;  // Number of tokens saved via selection context
}
```

- **On error:** Throw a standard `Error`. The provider catches it and sends an `analyzeError` message to the UI.

### `getGlobalHistory(): Promise<ManagerData>`

Called when the user opens the Manager panel or clicks **"Refresh"**.

- **Input:** None (filters are applied client-side).
- **Output:** Must return an object matching:

```typescript
interface ManagerData {
  sessions: SessionSummary[];
  global: GlobalStats;
}

interface SessionSummary {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;       // ISO 8601
  fileName: string;
  codeSummary: string;
  tutorialUrl: string;
  tokenStats: TokenStats;
}

interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  savedTokens: number;
  savedPercent: number;
}

interface GlobalStats {
  totalSessions: number;
  totalProjects: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalSavedTokens: number;
  averageSavedPercent: number;
}
```

---

## 4. Message Contracts

The Extension Host communicates with the React UIs via `webview.postMessage()`. You do **not** need to touch any of this — the providers handle it automatically. This section is here for reference only.

### Sidebar Messages

| Direction | `type` | Payload |
|---|---|---|
| **UI → Host** | `analyzeRequest` | `{ url: string }` |
| **Host → UI** | `analyzeResponse` | `{ context: string, tokensSaved: number }` |
| **Host → UI** | `analyzeError` | `{ message: string }` |
| **Host → UI** | `selectionChange` | `{ hasSelection: boolean }` |

### Manager Messages

| Direction | `type` | Payload |
|---|---|---|
| **UI → Host** | `requestRefreshHistory` | `{ projectId?, startDate?, endDate? }` |
| **Host → UI** | `historyData` | `ManagerData` (see above) |
| **Host → UI** | `historyError` | `{ code: string, message: string }` |
| **UI → Host** | `exportSessions` | `{ format: 'json' \| 'csv' }` |

---

## 5. Testing Your Changes

1. Edit **only** `src/services/mcpClient.ts`.
2. Run `npm run compile` (or `npm run watch` in the background).
3. Press **F5** in VS Code to launch the Extension Development Host.
4. Open the Sidebar, paste a URL, select code → click **Generate Insight**.
5. Open the Manager via Command Palette → verify session history loads.

If something breaks, check the **Output panel → "Extension Host"** for errors.

---

## 6. File Map

```
UI/
├── package.json                    ← Extension manifest + build scripts
├── tsconfig.json                   ← Extension host TypeScript config
├── src/
│   ├── extension.ts                ← Activation: registers sidebar + manager
│   ├── providers/
│   │   └── SidebarProvider.ts      ← WebviewViewProvider (calls mcpClient)
│   ├── panels/
│   │   └── ManagerPanel.ts         ← WebviewPanel singleton (calls mcpClient)
│   └── services/
│       └── mcpClient.ts            ← ✦ YOUR INTEGRATION POINT ✦
├── webview-ui/
│   ├── sidebar/                    ← Sidebar React app (pre-built in dist/)
│   └── manager/                    ← Manager React app (pre-built in dist/)
└── media/
    └── traecodecontext.svg         ← Activity bar icon
```
