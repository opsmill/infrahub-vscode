import * as vscode from 'vscode';

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
