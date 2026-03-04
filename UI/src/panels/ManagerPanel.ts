import * as vscode from 'vscode';

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

    const panel = vscode.window.createWebviewPanel(
      ManagerPanel.viewType,
      'TraeCodeContext Manager',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
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
      this.handleMessage(message);
    });
  }

  private handleMessage(message: IncomingManagerMessage): void {
    if (message.type === 'requestRefreshHistory') {
      vscode.window.showInformationMessage('Refreshing manager history...');

      setTimeout(() => {
        void this.panel.webview.postMessage({
          type: 'historyData',
          payload: {
            sessions: [],
            global: {
              totalSessions: 0,
              totalProjects: 0,
              totalPromptTokens: 0,
              totalCompletionTokens: 0,
              totalSavedTokens: 0,
              averageSavedPercent: 0,
            },
          },
        });
      }, 600);

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
      content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
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
