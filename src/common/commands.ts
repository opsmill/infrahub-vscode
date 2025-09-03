import * as vscode from 'vscode';
import * as path from 'path';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';
import { InfrahubYamlTreeItem } from '../treeview/infrahubYamlTreeViewProvider';
import { promptForVariables, searchForConfigSchemaFiles } from '../common/infrahub';
import { BranchCreateInput } from 'infrahub-sdk/src/graphql/branch';
import { get } from 'http';
import { PythonExtension } from '@vscode/python-extension';
import { exec } from 'child_process';

/**
 * Runs an infrahubctl command in a VS Code terminal using the active Python environment.
 * Sets INFRAHUB_API_TOKEN and INFRAHUB_ADDRESS from the selected branch.
 * Optionally shows a notification.
 */
async function runInfrahubctlInTerminal(
    commandArgs: string,
    notification?: string,
    selectedBranch?: any
) {
    try {
        // Copy string values from process.env for terminal environment
        const env: { [key: string]: string } = {};
        for (const key of Object.keys(process.env)) {
            const val = process.env[key];
            if (typeof val === 'string') {
                env[key] = val;
            }
        }
        // Set Infrahub environment variables if available
        if (selectedBranch?.client?.token) {
            env['INFRAHUB_API_TOKEN'] = selectedBranch.client.token;
        }
        if (selectedBranch?.client?.address) {
            env['INFRAHUB_ADDRESS'] = selectedBranch.client.address;
        }

        // Get active Python environment and resolve infrahubctl path
        const pythonApi: PythonExtension = await PythonExtension.api();
        const environmentPathObj = pythonApi.environments.getActiveEnvironmentPath();
        const pythonPath = environmentPathObj?.path || environmentPathObj?.id || '';
        const infrahubctlPath = pythonPath ? path.join(path.dirname(pythonPath), 'infrahubctl') : 'infrahubctl';
        console.log('Using infrahubctl at:', infrahubctlPath);
        console.log(selectedBranch);

        // Use server name for terminal uniqueness
        const serverName = selectedBranch?.client?.baseUrl;
        const terminalName = `Infrahubctl-${serverName}`;

        // Reuse or create a terminal for this server
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);
        if (!terminal) {
            const terminalOptions: vscode.TerminalOptions = {
                env,
                name: terminalName,
            };
            terminal = vscode.window.createTerminal(terminalOptions);
        }
        terminal.show();

        // Run the command
        const commandToRun = `${infrahubctlPath} ${commandArgs}`;
        terminal.sendText(commandToRun);

        if (notification) {
            vscode.window.showInformationMessage(notification);
        }
    } catch (error) {
        vscode.window.showErrorMessage('Failed to run infrahubctl command in terminal.');
        console.error('Terminal error:', error);
    }
}

/**
 * Executes a GraphQL query for the selected Infrahub YAML tree item.
 * Prompts for required/optional variables, branch selection, and displays results in a webview.
 */
export async function executeInfrahubGraphQLQuery(item: InfrahubYamlTreeItem): Promise<any> {
    if (!item.gqlInfo) {
        vscode.window.showErrorMessage('No GraphQL query information available for this item.');
        return;
    }
    console.info('GQL Query Info: ', item);
    let gqlVarsFilled = {};
    if (item.gqlInfo['required']) {
        gqlVarsFilled = {
            ...gqlVarsFilled,
            ...(await promptForVariables(item.gqlInfo['required'], true)),
        };
    }
    if (item.gqlInfo['optional']) {
        gqlVarsFilled = {
            ...gqlVarsFilled,
            ...(await promptForVariables(item.gqlInfo['optional'], false)),
        };
    }
    console.info('gqlVarsFilled:', gqlVarsFilled);

    // Prompt for server and branch selection
    const branchResult = await getBranchPrompt();
    if (!branchResult) {
        vscode.window.showErrorMessage('No Infrahub server or branch selected.');
        return;
    }
    const client = branchResult.client;
    const branch = branchResult.branch;

    // Optionally add branch info to variables
    // gqlVarsFilled.branch = branch.name;

    console.info('Executing GraphQL Query - ' + item.label + ' on branch ' + branch.name);
    const queryResult = await client.executeGraphQL(item.gqlInfo['query'], gqlVarsFilled);
    console.info('result:', queryResult);

    // Show result in a webview panel
    const panel = vscode.window.createWebviewPanel(
        'infrahubGraphQLResult',
        'Infrahub GraphQL Result',
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    panel.webview.html = getGraphQLResultHtml(queryResult, gqlVarsFilled);
}

/**
 * Returns HTML for displaying GraphQL query results and variables.
 */
function getGraphQLResultHtml(result: any, variables: any): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Infrahub GraphQL Result</title>
            <style>
                body { font-family: monospace; padding: 1em; background: #1e1e1e; color: #d4d4d4; }
                pre { white-space: pre-wrap; word-break: break-all; }
                h2 { margin-top: 2em; }
            </style>
        </head>
        <body>
            <h2>Variables</h2>
            <pre>${escapeHtml(JSON.stringify(variables, null, 2))}</pre>
            <h2>GraphQL Query Result</h2>
            <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
        </body>
        </html>
    `;
}

/**
 * Escapes HTML special characters for safe rendering.
 */
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Shows an error message and logs the error to the console.
 */
function showError(message: string, error?: unknown) {
    vscode.window.showErrorMessage(message);
    if (error) {
        console.error(message, error);
    }
}

/**
 * Shows an information message.
 */
function showInfo(message: string) {
    vscode.window.showInformationMessage(message);
}

/**
 * Shows a modal warning message and returns true if confirmed.
 */
async function showConfirm(message: string, confirmText: string, cancelText: string = 'Cancel'): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(message, { modal: true }, confirmText, cancelText);
    return result === confirmText;
}

/**
 * Prompts the user to select an Infrahub server from configuration.
 * Returns an InfrahubClient for the selected server.
 */
async function getServerPrompt(): Promise<{ client: InfrahubClient } | undefined> {
    const config = vscode.workspace.getConfiguration('infrahub-vscode');
    const servers = config.get<any[]>('servers', []);
    if (!servers.length) {
        showError('No Infrahub servers configured.');
        return;
    }
    const pick = await vscode.window.showQuickPick(
        servers.map(s => ({ label: s.name, description: s.address, server: s })),
        { placeHolder: 'Select Infrahub server' }
    );
    if (!pick) {
        showInfo('Server selection cancelled.');
        return;
    }
    const options: InfrahubClientOptions = { address: pick.server.address };
    if (pick.server.api_token) {
        options.token = pick.server.api_token;
    }
    return { client: new InfrahubClient(options) };
}

/**
 * Prompts the user to select an Infrahub server and branch.
 * Returns both the InfrahubClient and branch object.
 */
export async function getBranchPrompt(serverItem?: { client: InfrahubClient }): Promise<{ client: InfrahubClient, branch: any } | undefined> {
    let client: InfrahubClient;
    if (serverItem && serverItem.client) {
        client = serverItem.client;
    } else {
        const serverResult = await getServerPrompt();
        if (!serverResult) {
            return;
        }
        client = serverResult.client;
    }
    let branches: any = [];
    try {
        branches = await client.branch.all();
    } catch (err) {
        showError('Failed to fetch branches.', err);
        return;
    }
    const branchArray = Object.values(branches).filter((b: any) => b && typeof b === 'object');
    if (!branchArray.length) {
        showError('No branches found for this server.');
        return;
    }
    const pick = await vscode.window.showQuickPick(
        branchArray.map((b: any) => ({ label: b.name, description: b.description || '', branch: b })),
        { placeHolder: 'Select branch' }
    );
    if (!pick) {
        showInfo('Branch selection cancelled.');
        return;
    }
    return { client, branch: pick.branch };
}

/**
 * Deletes a branch from Infrahub.
 * Prompts for branch selection if not provided.
 * Shows progress and refreshes the tree view provider if available.
 */
export async function deleteBranchCommand(branchItem: any, provider: { refresh?: () => void } | undefined) {
    if (!branchItem) {
        const result = await getServerPrompt();
        if (!result) { return; }
        let branches: any = [];
        try {
            branches = await result.client.branch.all();
        } catch (err) {
            showError('Failed to fetch branches.', err);
            return;
        }
        const branchArray = Object.values(branches).filter((b: any) => b && typeof b === 'object');
        if (!branchArray.length) {
            showError('No branches found for this server.');
            return;
        }
        const pick = await vscode.window.showQuickPick(
            branchArray.map((b: any) => ({ label: b.name, description: b.description || '', branch: b })),
            { placeHolder: 'Select branch to delete' }
        );
        if (!pick) {
            showInfo('Branch deletion cancelled.');
            return;
        }
        branchItem = { ...pick.branch, client: result.client };
    }
    if (branchItem.defaultBranch) {
        showError('Cannot delete the default branch.');
        return;
    }
    const confirm = await showConfirm(
        `Are you sure you want to delete branch "${branchItem.name}"? This action cannot be undone.`,
        'Delete',
        'Cancel'
    );
    if (!confirm) {
        showInfo('Branch deletion cancelled.');
        return;
    }
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Deleting branch "${branchItem.name}"...`,
            cancellable: false,
        },
        async () => {
            try {
                const response = await branchItem.client.branch.delete(branchItem.name);
                if (response) {
                    showInfo(`Branch "${branchItem.name}" deleted successfully.`);
                    provider?.refresh?.();
                }
            } catch (error) {
                showError(`Error deleting branch "${branchItem.name}".`, error);
            }
        },
    );
}

/**
 * Creates a new branch in Infrahub.
 * Prompts for branch name, description, sync option, and confirmation.
 * Shows progress and refreshes the tree view provider if available.
 */
export async function newBranchCommand(serverItem: any, provider: { refresh?: () => void } | undefined) {
    if (!serverItem) {
        const result = await getServerPrompt();
        if (!result) { return; }
        serverItem = result;
    }
    const branchName = await vscode.window.showInputBox({
        prompt: 'Enter new branch name',
        placeHolder: 'e.g., feature/my-new-feature',
        validateInput: (text) => {
            if (!text) { return 'Branch name cannot be empty.'; }
            if (!/^[-\w\/]+$/.test(text)) { return 'Branch name contains invalid characters.'; }
            return null;
        },
    });
    if (!branchName) {
        showInfo('Branch creation cancelled.');
        return;
    }
    let branchDescription = await vscode.window.showInputBox({
        prompt: 'Enter branch description (optional)',
        placeHolder: 'e.g., Adds user management features',
    });
    branchDescription = branchDescription || '';
    const syncWithGitOption = await vscode.window.showQuickPick(['No', 'Yes'], {
        placeHolder: 'Sync with Git remote?',
    });
    if (!syncWithGitOption) {
        showInfo('Branch creation cancelled.');
        return;
    }
    const syncWithGit = syncWithGitOption === 'Yes';
    const confirm = await showConfirm(
        `Create branch "${branchName}"?`,
        'Create',
        'Cancel'
    );
    if (!confirm) {
        showInfo('Branch creation cancelled.');
        return;
    }
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Creating branch "${branchName}"...`,
            cancellable: false,
        },
        async () => {
            try {
                const input: BranchCreateInput = {
                    name: branchName,
                    sync_with_git: syncWithGit,
                    wait_until_completion: true,
                    description: branchDescription,
                };
                const response = await serverItem.client.branch.create(input);
                if (response.id) {
                    showInfo(`Branch "${branchName}" created successfully.`);
                    provider?.refresh?.();
                }
            } catch (error) {
                showError(`Error creating branch "${branchName}".`, error);
            }
        },
    );
}

/**
 * Prompts for branch selection and runs an infrahubctl schema command (check/load) on the target path.
 */
async function promptBranchAndRunInfrahubctl(
    action: 'check' | 'load',
    targetPath: string
) {
    const selectedBranch = await getBranchPrompt();
    if (!selectedBranch) {
        vscode.window.showInformationMessage(`Schema ${action} cancelled: No branch selected.`);
        return;
    }
    const commandArgs = `schema ${action} "${targetPath}" --branch "${selectedBranch.branch.name}"`;
    await runInfrahubctlInTerminal(commandArgs, `Running: infrahubctl ${commandArgs}`, selectedBranch);
}

/**
 * Finds all config schema files in the workspace and runs infrahubctl schema check on the first base path.
 */
export async function checkAllSchemaFiles() {
    const foundFiles = searchForConfigSchemaFiles();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const basePaths = new Set<string>();
    for (const absPath of Object.keys(foundFiles)) {
        const relPath = path.relative(workspaceFolder, absPath);
        const baseDir = path.dirname(relPath);
        basePaths.add(baseDir);
    }
    // Use the first base path found
    const firstBasePath = basePaths.values().next().value ?? '';
    await promptBranchAndRunInfrahubctl('check', firstBasePath);
}

/**
 * Finds all config schema files in the workspace and runs infrahubctl schema load on the first base path.
 */
export async function loadAllSchemaFiles() {
    const foundFiles = searchForConfigSchemaFiles();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    const basePaths = new Set<string>();
    for (const absPath of Object.keys(foundFiles)) {
        const relPath = path.relative(workspaceFolder, absPath);
        const baseDir = path.dirname(relPath);
        basePaths.add(baseDir);
    }
    // Use the first base path found
    const firstBasePath = basePaths.values().next().value ?? '';
    await promptBranchAndRunInfrahubctl('load', firstBasePath);
}

/**
 * Runs infrahubctl schema check on a specific file.
 */
export async function checkSchemaFile(filePath: string) {
    await promptBranchAndRunInfrahubctl('check', filePath);
}

/**
 * Runs infrahubctl schema load on a specific file.
 */
export async function loadSchemaFile(filePath: string) {
    await promptBranchAndRunInfrahubctl('load', filePath);
}
