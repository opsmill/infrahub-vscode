import * as vscode from 'vscode';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';
import { InfrahubYamlTreeItem } from '../treeview/infrahubYamlTreeViewProvider';
import { promptForVariables } from '../common/infrahub';
import { BranchCreateInput } from 'infrahub-sdk/src/graphql/branch';


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

    // Prompt user to select a server
    const result = await getServerPrompt();
    if (!result) {
        vscode.window.showErrorMessage('No Infrahub server selected.');
        return;
    }
    const client = result.client;

    console.info('Executing GraphQL Query - ' + item.label);
    const queryResult = await client.executeGraphQL(item.gqlInfo['query'], gqlVarsFilled);
    console.info('result:', queryResult);

    // Display the result in a webview panel
    const panel = vscode.window.createWebviewPanel(
        'infrahubGraphQLResult',
        'Infrahub GraphQL Result',
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    panel.webview.html = getGraphQLResultHtml(queryResult, gqlVarsFilled);
}

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

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Helper to show error message and log error
 */
function showError(message: string, error?: unknown) {
    vscode.window.showErrorMessage(message);
    if (error) {
        console.error(message, error);
    }
}

/**
 * Helper to show information message
 */
function showInfo(message: string) {
    vscode.window.showInformationMessage(message);
}

/**
 * Helper to show warning message and return confirmation
 */
async function showConfirm(message: string, confirmText: string, cancelText: string = 'Cancel'): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(message, { modal: true }, confirmText, cancelText);
    return result === confirmText;
}

/**
 * Prompt user to select an Infrahub server and return client
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
 * Delete a branch from Infrahub
 * @param branchItem Branch item object
 * @param provider Tree view provider
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
 * Create a new branch in Infrahub
 * @param serverItem Server item object
 * @param provider Tree view provider
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
