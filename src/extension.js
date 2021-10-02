// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");

class VisualPanel {
  static currentPanel = undefined;
  static viewType = "visualRegex";
  static pattern = undefined;
  panel = null;
  extensionUri = null;
  disposabless = [];

  constructor(panel, extensionUri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    // Set the webview's initial html content
    this.update();
    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this.panel.onDidDispose(() => this.dispose(), null, this.disposabless);
    // Update the content based on view changes
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          this.update();
        }
      },
      null,
      this.disposabless
    );
  }

  static revive(panel, extensionUri) {
    VisualPanel.currentPanel = new VisualPanel(panel, extensionUri);
  }

  static createOrShow(extensionUri, pattern) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    // If we already have a panel, show it.
    if (VisualPanel.currentPanel) {
      VisualPanel.currentPanel.panel.reveal(column);
      return;
    }
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      VisualPanel.viewType,
      "Visual Regex",
      column || vscode.ViewColumn.Two, // Editor column to show the new panel in
      {
        enableScripts: true,
      }
    );

    VisualPanel.pattern = pattern;
    VisualPanel.currentPanel = new VisualPanel(panel, extensionUri);
  }

  dispose() {
    VisualPanel.currentPanel = undefined;

    // Clean up our resources
    this.panel.dispose();

    while (this.disposabless.length) {
      const x = this.disposabless.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  update() {
    this.panel.title = "Visual Regex";
    this.panel.webview.html = this.getHtmlForWebview();
  }

  getHtmlForWebview() {
    return `<!DOCTYPE html>
            <html lang="en">
              <head>
                  <title>Visual Regex</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body>
                <p><code>${VisualPanel.pattern}</code></p>
                <script type="module">
                  import visualRegex from 'https://cdn.skypack.dev/visual-regex';
                  const canvas = visualRegex(${VisualPanel.pattern});
                  canvas.style.transform = 'scale(0.5)';
                  canvas.style.transformOrigin = 'left top';
                  document.body.appendChild(canvas);
                </script>
              </body>
            </html>
    `;
  }
}

async function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("visual-regex.visualRegex", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const document = editor.document;
      const selection = editor.selection;
      const pattern = document.getText(selection);

      if (!pattern) return;

      VisualPanel.createOrShow(context.extensionUri, new RegExp(pattern));
    })
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer(VisualPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel) {
        VisualPanel.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

async function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
