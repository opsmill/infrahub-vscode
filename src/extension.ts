// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { YamlDefinitionProvider } from './YamlDefinitionProvider';
import { YamlDocumentSymbolProvider } from './YamlDocumentSymbolProvider';

// Import Tree Views
import { InfrahubServerTreeViewProvider } from './treeview/InfrahubServerTreeViewProvider';
import { infrahubTreeViewProvider } from './treeview/infrahubYamlTreeViewProvider';

// Extension Utilities
import {
	openFileAtLocation,
} from './common/infrahub';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';

let statusBar: vscode.StatusBarItem;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Starting Infrahub Extension');

	const schemaDirectory = vscode.workspace.getConfiguration().get<string>('infrahub-vscode.schemaDirectory', '');
	// ===============================================
	// Register the definition provider for yaml files
	// ===============================================
	const yamlSelector: vscode.DocumentSelector = { language: 'yaml', scheme: 'file' };
	const provider = new YamlDefinitionProvider(schemaDirectory);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(yamlSelector, provider)
	);
	// ===============================================
	// Register the custom document symbol provider for YAML
	// ===============================================
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
			yamlSelector,
			new YamlDocumentSymbolProvider()
		)
	);

	// ===============================================
	// Register custom treeviews
	// ===============================================
	const InfrahubServerTreeView = new InfrahubServerTreeViewProvider(context);
	const InfrahubYamlTreeViewProvider = new infrahubTreeViewProvider(context);
	vscode.window.registerTreeDataProvider('InfrahubServerTreeView', InfrahubServerTreeView);
	vscode.window.registerTreeDataProvider('infrahubYamlTreeView', InfrahubYamlTreeViewProvider);
	setInterval(() => InfrahubServerTreeView.refresh(), 10000);

	// ===============================================
	// Register custom commands
	// ===============================================
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.editInfrahubYaml', (item) => {
			openFileAtLocation(item.filePath, item.lineNumber || 0);
		}),
	);

	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = 'Infrahub';
	statusBar.tooltip = 'Infrahub Server';
	statusBar.show();
	setInterval(() => updateServerInfo(), 10000);

}

async function updateServerInfo(): Promise<void> {
	const config = vscode.workspace.getConfiguration('infrahub-vscode');
	const servers = config.get<any[]>('servers', []);
	const firstServer = servers.length > 0 ? servers[0] : null;
	if (!firstServer || !firstServer.address) {
		statusBar.text = 'Infrahub: No server set';
		statusBar.backgroundColor = new vscode.ThemeColor('statusBar.noFolderBackground');
		return;
	}
	try {
		const options: InfrahubClientOptions = { address: firstServer.address };
		if (firstServer.token) {
			options.token = firstServer.token;
		}
		const client = new InfrahubClient(options);
		const version = await client.getVersion();
		statusBar.text = `Infrahub: v${version} (${firstServer.name})`;
		statusBar.backgroundColor = new vscode.ThemeColor('statusBar.background');
	} catch (err) {
		statusBar.text = 'Infrahub: Server unreachable';
		statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
