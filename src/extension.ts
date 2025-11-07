// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { YamlDefinitionProvider } from './YamlDefinitionProvider';
import { YamlDocumentSymbolProvider } from './YamlDocumentSymbolProvider';

// Import Tree Views
import { InfrahubServerTreeViewProvider, InfrahubServer } from './treeview/InfrahubServerTreeViewProvider';
import { InfrahubYamlTreeItem, infrahubTreeViewProvider } from './treeview/infrahubYamlTreeViewProvider';
import { InfrahubSchemaProvider, InfrahubSchemaTreeItem } from './treeview/infrahubSchemaTreeViewProvider';

// Extension Utilities
import { openFileAtLocation, searchForConfigSchemaFiles } from './common/infrahub';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';
import { executeInfrahubGraphQLQuery, checkAllSchemaFiles, loadAllSchemaFiles, checkSchemaFile, loadSchemaFile } from './common/commands';
import { newBranchCommand, deleteBranchCommand } from './common/commands';
let statusBar: vscode.StatusBarItem;

// Store the original NODE_TLS_REJECT_UNAUTHORIZED value to restore it later
let originalTlsRejectUnauthorized: string | undefined;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Starting Infrahub Extension');

	// Store the original NODE_TLS_REJECT_UNAUTHORIZED value
	originalTlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

	// Set NODE_TLS_REJECT_UNAUTHORIZED based on server configuration
	updateTlsEnvironment();

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
	const InfrahubSchemaTreeViewProvider = new InfrahubSchemaProvider(context);
	vscode.window.registerTreeDataProvider('infrahubServerTreeView', InfrahubServerTreeView);
	vscode.window.registerTreeDataProvider('infrahubYamlTreeView', InfrahubYamlTreeViewProvider);
	vscode.window.registerTreeDataProvider('infrahubSchemaTreeView', InfrahubSchemaTreeViewProvider);
	setInterval(() => InfrahubServerTreeView.refresh(), 10000);

	// ===============================================
	// Register custom commands
	// ===============================================
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.searchSchemaFiles', () => {
			searchForConfigSchemaFiles();
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.checkAllSchemaFiles', async () => {
			await checkAllSchemaFiles();
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.loadAllSchemaFiles', async () => {
			await loadAllSchemaFiles();
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.checkSchemaFile', async (uri) => {
			// Check if a URI was passed (from explorer/context)
			let filePath: string | undefined;
			if (uri && uri.fsPath) {
				filePath = uri.fsPath;
			} else if (uri instanceof InfrahubSchemaTreeItem) {
				// If the command is called from the schema tree view, use the item's filePath
				filePath = uri.filePath;
			} else {
				// If not from explorer/context, try to get the active editor's file path
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					filePath = activeEditor.document.uri.fsPath;
				}
			}

			if (!filePath) {
				vscode.window.showWarningMessage('No file selected or active to check schema.');
				return;
			}
			await checkSchemaFile(filePath);
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.loadSchemaFile', async (uri) => {
			// Check if a URI was passed (from explorer/context)
			let filePath: string | undefined;
			if (uri && uri.fsPath) {
				filePath = uri.fsPath;
			} else if (uri instanceof InfrahubSchemaTreeItem) {
				// If the command is called from the schema tree view, use the item's filePath
				filePath = uri.filePath;
			} else {
				// If not from explorer/context, try to get the active editor's file path
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					filePath = activeEditor.document.uri.fsPath;
				}
			}

			if (!filePath) {
				vscode.window.showWarningMessage('No file selected or active to check schema.');
				return;
			}
			await loadSchemaFile(filePath);
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.newBranch', (serverItem) => {
			newBranchCommand(serverItem, InfrahubServerTreeView);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.deleteBranch', (serverItem) => {
			deleteBranchCommand(serverItem, InfrahubServerTreeView);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.editInfrahubYaml', (item) => {
			openFileAtLocation(item.filePath, item.lineNumber || 0);
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.editGqlQuery', (item) => {
			openFileAtLocation(item.gqlFilePath, 0);
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('infrahub.executeGraphQLQuery', async (item: InfrahubYamlTreeItem) => {
			await executeInfrahubGraphQLQuery(item);
		}),
	);

	// ===============================================
	// Status Bar
	// ===============================================
	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = 'Infrahub';
	statusBar.tooltip = 'Infrahub Server';
	statusBar.show();
	setInterval(() => updateServerInfo(), 10000);

	// Listen for configuration changes to update TLS environment
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('infrahub-vscode.servers')) {
				updateTlsEnvironment();
			}
		})
	);
}

/**
 * Updates the NODE_TLS_REJECT_UNAUTHORIZED environment variable based on server configuration.
 * If any server has tls_insecure set to true, TLS verification is disabled globally.
 * 
 * Note: This affects all HTTPS connections made by the VS Code process, not just Infrahub SDK calls.
 * This is by design as requested in the issue to use NODE_TLS_REJECT_UNAUTHORIZED instead of 
 * passing TLS options to the SDK.
 */
function updateTlsEnvironment(): void {
	const config = vscode.workspace.getConfiguration('infrahub-vscode');
	const servers = config.get<InfrahubServer[]>('servers', []);
	const hasInsecureServer = servers.some(server => server.tls_insecure === true);
	
	if (hasInsecureServer) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	} else {
		// Restore to original value or delete if it wasn't set
		if (originalTlsRejectUnauthorized !== undefined) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsRejectUnauthorized;
		} else {
			delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		}
	}
}

async function updateServerInfo(): Promise<void> {
	const config = vscode.workspace.getConfiguration('infrahub-vscode');
	const servers = config.get<InfrahubServer[]>('servers', []);
	const firstServer = servers.length > 0 ? servers[0] : null;
	if (!firstServer || !firstServer.address) {
		statusBar.text = 'Infrahub: No server set';
		statusBar.backgroundColor = new vscode.ThemeColor('statusBar.noFolderBackground');
		return;
	}
	try {
		const options: InfrahubClientOptions = { address: firstServer.address };
		if (firstServer.api_token) {
			options.token = firstServer.api_token;
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
export function deactivate() {
	// Restore the original NODE_TLS_REJECT_UNAUTHORIZED value
	if (originalTlsRejectUnauthorized !== undefined) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsRejectUnauthorized;
	} else {
		delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	}
}
