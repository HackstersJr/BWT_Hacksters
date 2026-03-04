import * as vscode from 'vscode';
import { getGlobalHistory } from '../services/mcpClient';

interface ManagerRequestMessage {
  type: 'requestRefreshHistory';
  payload?: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface ManagerExportMessage {
  type: 'exportSessions';
  payload?: {
    format?: 'json' | 'csv';
  };
}

type IncomingManagerMessage = ManagerRequestMessage | ManagerExportMessage;

export class ManagerPanel {
  public static readonly viewType = 'traecodecontextManager';

  private static currentPanel: ManagerPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  public static render(extensionUri: vscode.Uri): void {
    if (ManagerPanel.currentPanel) {
      ManagerPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const managerDistUri = vscode.Uri.joinPath(extensionUri, 'webview-ui', 'manager', 'dist');

    const panel = vscode.window.createWebviewPanel(
      ManagerPanel.viewType,
      'TraeCodeContext Manager',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [managerDistUri],
      }
    );

    ManagerPanel.currentPanel = new ManagerPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => {
      ManagerPanel.currentPanel = undefined;
    });

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

    this.panel.webview.onDidReceiveMessage((message: IncomingManagerMessage) => {
      void this.handleMessage(message);
    });
  }

  private async handleMessage(message: IncomingManagerMessage): Promise<void> {
    if (message.type === 'requestRefreshHistory') {
      try {
        const data = await getGlobalHistory();

        void this.panel.webview.postMessage({
          type: 'historyData',
          payload: data,
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        void this.panel.webview.postMessage({
          type: 'historyError',
          payload: {
            code: 'FETCH_FAILED',
            message: errorMessage,
          },
        });
      }

      return;
    }

    if (message.type === 'exportSessions') {
      const format = message.payload?.format ?? 'json';
      vscode.window.showInformationMessage(`Exporting sessions as ${format}...`);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const managerDistUri = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'manager', 'dist');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(managerDistUri, 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(managerDistUri, 'assets', 'index.css'));
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <link rel="stylesheet" href="${styleUri}" />
    <title>TraeCodeContext Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';

    for (let index = 0; index < 32; index += 1) {
      value += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return value;
  }
}
