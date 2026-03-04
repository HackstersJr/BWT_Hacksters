
***

### Other supporting docs to create

1. `docs/UI-contracts.md`  
   - Define all `postMessage` payloads between:
     - Sidebar ↔ Extension.
     - Manager ↔ Extension.  
   - Helps keep your UI decoupled and easy to test / swap backends.

2. `docs/TRAE-integration.md`  
   - How to install the extension in TRAE IDE.  
   - How to configure `.trae/project_rules.md` and `mcp.json`.  
   - Recommended agent setup and examples.

3. `docs/token-accounting.md`  
   - Explain how you estimate tokens, baselines, and “tokens saved”.  
   - Note what’s approximate vs exact and how this maps to real provider limits.

4. `docs/architecture-diagram.png` (already planned)  
   - One diagram capturing:
     - Sidebar / Manager.
     - Extension host.
     - MCP server.
     - TRAE `.trae` config.

If you want, I can next draft `UI-contracts.md` with exact TypeScript interfaces for the messages, so you can start building and testing the UI immediately while backend catches up.
