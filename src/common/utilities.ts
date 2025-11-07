import * as vscode from 'vscode';
import { PythonExtension } from '@vscode/python-extension';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';
import * as path from 'path';

/**
 * Checks if a file exists at the given URI using the VS Code workspace API.
 * @param uri The URI of the file to check.
 * @returns Promise resolving to true if the file exists, false otherwise.
 */
export async function fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Escapes HTML special characters for safe rendering.
 */
export function escapeHtml(unsafe: string): string {
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
export function showError(message: string, error?: unknown) {
    vscode.window.showErrorMessage(message);
    if (error) {
        console.error(message, error);
    }
}

/**
 * Shows an information message.
 */
export function showInfo(message: string) {
    vscode.window.showInformationMessage(message);
}

/**
 * Shows a modal warning message and returns true if confirmed.
 */
export async function showConfirm(message: string, confirmText: string, cancelText: string = 'Cancel'): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(message, { modal: true }, confirmText, cancelText);
    return result === confirmText;
}

/**
 * Prompts for branch selection and runs an infrahubctl schema command (check/load) on the target path.
 */
export async function promptBranchAndRunInfrahubctl(
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
 * Runs an infrahubctl command in a VS Code terminal using the active Python environment.
 * Sets INFRAHUB_API_TOKEN and INFRAHUB_ADDRESS from the selected branch.
 * Optionally shows a notification.
 */
export async function runInfrahubctlInTerminal(
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
 * Prompts the user to select an Infrahub server from configuration.
 * Returns an InfrahubClient for the selected server.
 */
export async function getServerPrompt(): Promise<{ client: InfrahubClient } | undefined> {
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
    if (pick.server.tls_insecure === true) {
        options.tls = { rejectUnauthorized: false };
    }
    return { client: new InfrahubClient(options) };
}

/**
 * Returns HTML for displaying GraphQL query results and variables.
 */
export function getGraphQLResultHtml(result: any, variables: any): string {
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