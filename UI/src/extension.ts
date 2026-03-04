import * as vscode from 'vscode';
import { ManagerPanel } from './panels/ManagerPanel';
import { SidebarProvider } from './providers/SidebarProvider';

export function activate(context: vscode.ExtensionContext): void {
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
  );

  const selectionSubscription = vscode.window.onDidChangeTextEditorSelection((event) => {
    const hasSelection = !event.selections.every((selection) => selection.isEmpty);

    sidebarProvider.postMessageToWebview({
      type: 'selectionChange',
      payload: {
        hasSelection,
      },
    });
  });

  context.subscriptions.push(selectionSubscription);

  const openManagerCommand = vscode.commands.registerCommand('traecodecontext.openManager', () => {
    ManagerPanel.render(context.extensionUri);
  });

  context.subscriptions.push(openManagerCommand);

  const activeEditor = vscode.window.activeTextEditor;
  const initialHasSelection = activeEditor
    ? !activeEditor.selections.every((selection) => selection.isEmpty)
    : false;

  sidebarProvider.postMessageToWebview({
    type: 'selectionChange',
    payload: {
      hasSelection: initialHasSelection,
    },
  });
}

export function deactivate(): void {
  // no-op
}
