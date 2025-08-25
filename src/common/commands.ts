import * as vscode from 'vscode';
import { InfrahubClient, InfrahubClientOptions } from 'infrahub-sdk';
import { InfrahubYamlTreeItem } from '../treeview/infrahubYamlTreeViewProvider';
import { promptForVariables } from '../common/infrahub';

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

    const config = vscode.workspace.getConfiguration('infrahub-vscode');
    const servers = config.get<any[]>('servers');
    const address = servers?.[0]?.address;
    const token = servers?.[0]?.api_token;

    const options: InfrahubClientOptions = {
        address,
        token
    };

    const client = new InfrahubClient(options);

    console.info('Executing GraphQL Query - ' + item.label);
    const result = await client.executeGraphQL(item.gqlInfo['query'], gqlVarsFilled);
    console.info('result:', result);

    // Display the result in a webview panel
    const panel = vscode.window.createWebviewPanel(
        'infrahubGraphQLResult',
        'Infrahub GraphQL Result',
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    panel.webview.html = getGraphQLResultHtml(result, gqlVarsFilled);
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
