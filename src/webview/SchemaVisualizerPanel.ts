import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { SchemaVisualizerData } from './schemaTypes';

/**
 * Resolves the path to the schema-visualizer webview assets.
 * Handles symlinks (used by npm for local file: dependencies).
 */
function getWebviewAssetsPath(extensionPath: string): string {
    const nodeModulesPath = path.join(extensionPath, 'node_modules', '@infrahub', 'schema-visualizer', 'dist', 'webview');
    try {
        // Resolve symlinks to get the real path
        const resolvedPath = fs.realpathSync(nodeModulesPath);
        console.log(`Schema visualizer assets path: ${resolvedPath}`);
        return resolvedPath;
    } catch (err) {
        // Fallback to the original path if realpathSync fails
        console.error(`Failed to resolve schema-visualizer path: ${err}`);
        return nodeModulesPath;
    }
}

/**
 * Manages the Schema Visualizer webview panel
 */
export class SchemaVisualizerPanel {
    public static currentPanel: SchemaVisualizerPanel | undefined;
    public static readonly viewType = 'infrahubSchemaVisualizer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _webviewAssetsUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(
        extensionUri: vscode.Uri,
        schemaData: SchemaVisualizerData,
        serverName: string,
        branchName: string
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (SchemaVisualizerPanel.currentPanel) {
            SchemaVisualizerPanel.currentPanel._panel.reveal(column);
            SchemaVisualizerPanel.currentPanel._update(schemaData, serverName, branchName);
            return;
        }

        // Resolve the real path to webview assets (handles symlinks)
        const webviewAssetsPath = getWebviewAssetsPath(extensionUri.fsPath);
        console.log(`Extension URI fsPath: ${extensionUri.fsPath}`);
        console.log(`Webview assets path: ${webviewAssetsPath}`);

        // Check if the path exists
        if (!fs.existsSync(webviewAssetsPath)) {
            console.error(`Webview assets path does not exist: ${webviewAssetsPath}`);
            vscode.window.showErrorMessage(`Schema visualizer assets not found at: ${webviewAssetsPath}. Run 'npm run build:webview' in the schema-visualizer package.`);
            return;
        }

        const webviewAssetsUri = vscode.Uri.file(webviewAssetsPath);
        console.log(`Webview assets URI: ${webviewAssetsUri.toString()}`);

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            SchemaVisualizerPanel.viewType,
            `Schema: ${serverName} (${branchName})`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    webviewAssetsUri,
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        SchemaVisualizerPanel.currentPanel = new SchemaVisualizerPanel(
            panel,
            extensionUri,
            webviewAssetsUri,
            schemaData,
            serverName,
            branchName
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        webviewAssetsUri: vscode.Uri,
        schemaData: SchemaVisualizerData,
        serverName: string,
        branchName: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._webviewAssetsUri = webviewAssetsUri;

        // Set the webview's initial html content
        this._update(schemaData, serverName, branchName);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'nodeClick':
                        vscode.window.showInformationMessage(`Selected: ${message.nodeId}`);
                        return;
                    case 'error':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        SchemaVisualizerPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(schemaData: SchemaVisualizerData, serverName: string, branchName: string) {
        this._panel.title = `Schema: ${serverName} (${branchName})`;
        this._panel.webview.html = this._getHtmlForWebview(
            this._panel.webview,
            schemaData,
            serverName,
            branchName
        );
    }

    private _getHtmlForWebview(
        webview: vscode.Webview,
        schemaData: SchemaVisualizerData,
        serverName: string,
        branchName: string
    ): string {
        // Get URIs for the bundled visualizer assets (using resolved path)
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._webviewAssetsUri, 'schema-visualizer.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._webviewAssetsUri, 'schema-visualizer.css')
        );

        // Use a nonce to allow specific scripts to run
        const nonce = getNonce();

        // Serialize schema data for injection
        const schemaDataJson = JSON.stringify(schemaData);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob: https:; font-src ${webview.cspSource} data:; connect-src https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com;">
    <title>Schema Visualizer - ${serverName} (${branchName})</title>
    <link href="${styleUri}" rel="stylesheet">
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        #root {
            width: 100%;
            height: 100%;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #64748b;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 12px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Loading schema visualizer...</span>
        </div>
    </div>

    <script nonce="${nonce}">
        // Store the schema data globally before loading the visualizer
        window.schemaVisualizerData = ${schemaDataJson};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script nonce="${nonce}">
        // Render the visualizer once the script is loaded
        (function() {
            const container = document.getElementById('root');
            if (window.renderSchemaVisualizer && window.schemaVisualizerData) {
                window.renderSchemaVisualizer(container, window.schemaVisualizerData);
            } else {
                container.innerHTML = '<div class="loading" style="color: #ef4444;">Failed to load schema visualizer</div>';
            }
        })();
    </script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
