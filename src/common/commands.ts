import * as vscode from 'vscode';
import * as path from 'path';
import { InfrahubYamlTreeItem } from '../treeview/infrahubYamlTreeViewProvider';
import { promptForVariables, searchForConfigSchemaFiles } from '../common/infrahub';
import { BranchCreateInput } from 'infrahub-sdk/src/graphql/branch';
import { showError, showInfo, escapeHtml, showConfirm, promptBranchAndRunInfrahubctl, getBranchPrompt, getServerPrompt, getGraphQLResultHtml } from '../common/utilities';


/**
 * Executes a GraphQL query for the selected Infrahub YAML tree item.
 * Prompts for required/optional variables, branch selection, and displays results in a webview.
 */

// Map to store/reuse webview panels by unique key (includes client.address)
const gqlResultPanels: Map<string, vscode.WebviewPanel> = new Map();

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

    // Read the GraphQL query from the file path
    let gqlQuery = '';
    if (item.gqlFilePath) {
        try {
            const fs = await import('fs');
            gqlQuery = fs.readFileSync(item.gqlFilePath, 'utf8');
        } catch (err) {
            vscode.window.showErrorMessage('Failed to read GraphQL file: ' + item.gqlFilePath);
            return;
        }
    } else {
        vscode.window.showErrorMessage('No GraphQL file path found for this item.');
        return;
    }

    console.info('Executing GraphQL Query - ' + item.label + ' on branch ' + branch.name);
    console.info(gqlQuery);
    const queryResult = await client.executeGraphQL(gqlQuery, gqlVarsFilled);
    console.info('result:', queryResult);

    // --- Uniqueness key includes client.address, branch.name, and item.label ---
    const serverAddress = (client as any).baseUrl;
    const panelKey = `${item.label}::${branch.name}::${serverAddress}`;
    let panel = gqlResultPanels.get(panelKey);
    if (panel) {
        panel.reveal(vscode.ViewColumn.Two);
        panel.webview.html = getGraphQLResultHtml(queryResult, gqlVarsFilled);
        return;
    }
    // --- End uniqueness block ---

    // Show result in a webview panel
    panel = vscode.window.createWebviewPanel(
        'infrahubGraphQLResult',
        `Infrahub GraphQL Result: ${item.label} [${branch.name}] (${serverAddress})`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    panel.webview.html = getGraphQLResultHtml(queryResult, gqlVarsFilled);
    gqlResultPanels.set(panelKey, panel);
    panel.onDidDispose(() => {
        gqlResultPanels.delete(panelKey);
    });
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
