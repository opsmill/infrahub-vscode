// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { YamlDefinitionProvider } from './YamlDefinitionProvider';
import { YamlDocumentSymbolProvider } from './YamlDocumentSymbolProvider';
import { InfrahubServerTreeViewProvider } from './treeview/InfrahubServerTreeViewProvider';

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
}

// This method is called when your extension is deactivated
export function deactivate() {}
