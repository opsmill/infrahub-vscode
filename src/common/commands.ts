import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InfrahubClient, gql, InfrahubClientOptions } from 'infrahub-sdk';
import { InfrahubYamlTreeItem } from '../treeview/infrahubYamlTreeViewProvider';
import {
    promptForVariables,
} from '../common/infrahub';

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
    // TODO: We need to figure out how a user can select an Infrahub server and branch
    const address = servers?.[0]?.address;
    const token = servers?.[0]?.api_token;

    const options: InfrahubClientOptions = {
        address,
        token
    };

    const client = new InfrahubClient(options);

    console.info('Executing GraphQL Query - ' + item.label);
    const result = client.executeGraphQL(item.gqlInfo['query'], gqlVarsFilled);
    console.info('result:', result);
    const tempFilePath = path.join(os.tmpdir(), `infrahub-api-output-${Date.now()}.json`);
    // Write the content to the temp file
    fs.writeFileSync(tempFilePath, JSON.stringify(result, null, 4), 'utf8');
    // Open the file in VS Code
    const doc = await vscode.workspace.openTextDocument(tempFilePath);
    vscode.window.showTextDocument(doc, { preview: false });
    fs.rmSync(tempFilePath);
}
