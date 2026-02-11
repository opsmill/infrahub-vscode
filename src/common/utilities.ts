import * as vscode from 'vscode';
import { PythonExtension } from '@vscode/python-extension';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';
import * as path from 'path';
import { InfrahubctlChecker } from './infrahubctlChecker';

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
    selectedBranch?: { serverAddress?: string, token?: string }
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
        if (selectedBranch?.token) {
            env['INFRAHUB_API_TOKEN'] = selectedBranch.token;
        }
        if (selectedBranch?.serverAddress) {
            env['INFRAHUB_ADDRESS'] = selectedBranch.serverAddress;
        }

        // Get active Python environment and resolve infrahubctl path
        const pythonApi: PythonExtension = await PythonExtension.api();
        const environmentPathObj = pythonApi.environments.getActiveEnvironmentPath();
        const pythonPath = environmentPathObj?.path || environmentPathObj?.id || '';
        const infrahubctlPath = pythonPath ? path.join(path.dirname(pythonPath), 'infrahubctl') : 'infrahubctl';
        console.log('Using infrahubctl at:', infrahubctlPath);
        console.log(selectedBranch);

        // Use server address for terminal uniqueness
        const terminalName = `Infrahubctl-${selectedBranch?.serverAddress || 'default'}`;

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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if this might be an infrahubctl not found error
        if (errorMessage.includes('not found') || errorMessage.includes('command not found')) {
            const checker = new InfrahubctlChecker();
            const guidance = await checker.getInstallationGuidance();

            const installAction = 'Installation Guide';
            const result = await vscode.window.showErrorMessage(
                `Failed to run infrahubctl command: ${errorMessage}

This usually means infrahubctl is not installed or not available in your Python environment.`,
                installAction,
                'Dismiss'
            );

            if (result === installAction) {
                vscode.window.showInformationMessage(guidance, { modal: true });
            }
        } else {
            vscode.window.showErrorMessage(`Failed to run infrahubctl command in terminal: ${errorMessage}`);
        }

        console.error('Terminal error:', error);
    }
}

/**
 * Branch prompt result including server info
 */
export interface BranchPromptResult {
    client: InfrahubClient;
    branch: any;
    serverName: string;
    serverAddress: string;
    token?: string;
}

/**
 * Prompts the user to select an Infrahub server and branch.
 * If serverItem is provided (with client), skips server selection.
 * Returns both the InfrahubClient, branch object, and server info.
 */
export async function getBranchPrompt(serverItem?: { client: InfrahubClient; name?: string; url?: string; token?: string }): Promise<BranchPromptResult | undefined> {
    let client: InfrahubClient;
    let serverName: string = 'Unknown Server';
    let serverAddress: string = '';
    let token: string | undefined;

    if (serverItem && serverItem.client) {
        client = serverItem.client;
        // Get server info from the serverItem (tree view item has name and url properties)
        serverName = serverItem.name || 'Unknown Server';
        serverAddress = serverItem.url || (client as any).baseUrl || '';
        token = serverItem.token;
    } else {
        const serverResult = await getServerPrompt();
        if (!serverResult) {
            return;
        }
        client = serverResult.client;
        serverName = serverResult.serverName;
        serverAddress = serverResult.serverAddress;
        token = serverResult.token;
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
    return { client, branch: pick.branch, serverName, serverAddress, token };
}

/**
 * Server info returned from getServerPrompt
 */
export interface ServerPromptResult {
    client: InfrahubClient;
    serverName: string;
    serverAddress: string;
    token?: string;
}

/**
 * Prompts the user to select an Infrahub server from configuration.
 * Returns an InfrahubClient for the selected server along with server info.
 */
export async function getServerPrompt(): Promise<ServerPromptResult | undefined> {
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
    return {
        client: new InfrahubClient(options),
        serverName: pick.server.name,
        serverAddress: pick.server.address,
        token: pick.server.api_token
    };
}

/**
 * Checks if infrahubctl is available before running commands.
 * Shows a warning dialog with installation guidance if not available.
 * Returns true if available or user chooses to continue anyway.
 */
export async function checkInfrahubctlBeforeCommand(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('infrahub-vscode');
    const showWarnings = config.get<boolean>('showInfrahubctlWarnings', true);

    if (!showWarnings) {
        return true; // Skip check if warnings are disabled
    }

    const checker = new InfrahubctlChecker();
    const result = await checker.checkInfrahubctlAvailability();

    if (result.isAvailable) {
        return true;
    }

    // Show warning dialog
    const guidance = await checker.getInstallationGuidance();
    const installAction = 'Install Guide';
    const continueAction = 'Continue Anyway';
    const cancelAction = 'Cancel';

    const choice = await vscode.window.showWarningMessage(
        `infrahubctl is required for this operation but was not found.

${result.errorMessage || 'Not found in Python environment'}

This command may fail without infrahubctl installed.`,
        { modal: true },
        installAction,
        continueAction,
        cancelAction
    );

    if (choice === installAction) {
        // Show detailed guidance
        const detailChoice = await vscode.window.showInformationMessage(
            guidance,
            { modal: true },
            'Open Documentation',
            'Continue Anyway',
            'Cancel'
        );

        if (detailChoice === 'Open Documentation') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.infrahub.app/getting-started/installation'));
            return false; // Don't continue
        }

        return detailChoice === 'Continue Anyway';
    }

    return choice === continueAction;
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