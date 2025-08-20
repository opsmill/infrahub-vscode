// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { YamlDefinitionProvider } from './YamlDefinitionProvider';
import { YamlDocumentSymbolProvider } from './YamlDocumentSymbolProvider';
import { InfrahubServerTreeViewProvider } from './treeview/InfrahubServerTreeViewProvider';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';

let statusBar: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const schemaDirectory = vscode.workspace.getConfiguration().get<string>('infrahub-vscode.schemaDirectory', '');
	// Register the definition provider for yaml files
	const yamlSelector: vscode.DocumentSelector = { language: 'yaml', scheme: 'file' };
	const provider = new YamlDefinitionProvider(schemaDirectory);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(yamlSelector, provider)
	);


	// Register the custom document symbol provider for YAML
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
		yamlSelector,
		new YamlDocumentSymbolProvider()
		)
	);

	const InfrahubServerTreeView = new InfrahubServerTreeViewProvider(context);
	vscode.window.registerTreeDataProvider('InfrahubServerTreeView', InfrahubServerTreeView);
	setInterval(() => InfrahubServerTreeView.refresh(), 10000);

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
	} catch (err) {
		statusBar.text = 'Infrahub: Server unreachable';
		statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
