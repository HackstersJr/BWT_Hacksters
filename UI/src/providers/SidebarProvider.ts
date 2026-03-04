import * as vscode from 'vscode';
import { analyzeTutorial } from '../services/mcpClient';

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

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    const sidebarDistUri = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'sidebar', 'dist');

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [sidebarDistUri],
    };

    // Prevent the React app from unmounting when user switches tabs
    (webviewView as unknown as { retainContextWhenHidden: boolean }).retainContextWhenHidden = true;

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, sidebarDistUri);

    webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
      const maybe = message as Partial<AnalyzeRequestMessage>;

      if (maybe?.type !== 'analyzeRequest') {
        return;
      }

      const url = maybe.payload?.url ?? '';
      if (!url) {
        return;
      }

      // Grab the selected code from the active editor
      const editor = vscode.window.activeTextEditor;
      const selectedCode = editor ? editor.document.getText(editor.selection) : '';

      try {
        const result = await analyzeTutorial(url, selectedCode);

        void this.view?.webview.postMessage({
          type: 'analyzeResponse',
          payload: {
            context: result.context,
            tokensSaved: result.tokensSaved,
          },
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        void this.view?.webview.postMessage({
          type: 'analyzeError',
          payload: {
            message: errorMessage,
          },
        });
      }
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
      content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
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
