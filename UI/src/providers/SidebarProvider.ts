import * as vscode from 'vscode';

interface AnalyzeRequestMessage {
  type: 'analyzeRequest';
  payload: {
    url: string;
  };
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'traecodecontext-sidebar';

  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    const sidebarDistUri = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'sidebar', 'dist');

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [sidebarDistUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, sidebarDistUri);

    webviewView.webview.onDidReceiveMessage((message: unknown) => {
      const maybe = message as Partial<AnalyzeRequestMessage>;

      if (maybe?.type !== 'analyzeRequest') {
        return;
      }

      const url = maybe.payload?.url ?? '(missing URL)';
      vscode.window.showInformationMessage(`Analyze request: ${url}. Sending to MCP backend...`);
    });
  }

  public postMessageToWebview(message: unknown): void {
    if (!this.view) {
      return;
    }

    void this.view.webview.postMessage(message);
  }

  private getHtmlForWebview(webview: vscode.Webview, distUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.css')
    );
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
    <title>TraeCodeContext</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';

    for (let index = 0; index < 32; index += 1) {
      nonce += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return nonce;
  }
}
