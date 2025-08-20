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
}

// This method is called when your extension is deactivated
export function deactivate() { }
