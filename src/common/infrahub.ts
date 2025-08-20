// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { parse } from 'graphql';

export async function openFileAtLocation(filePath: string, lineNumber: number): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(doc);

    const startLine = Math.max(0, lineNumber - 1);
    const range = doc.lineAt(startLine).range;
    editor.selection = new vscode.Selection(range.start, range.start);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

// Keeping this for now as we'll use it when adding the execute graphql query button in the InfrahubYamlTree view
export async function parseGraphQLQuery(path: string): Promise<{ [key: string]: string[] }> {
    const content = fs.readFileSync(path, 'utf8');
    const ast = parse(content);
    const foundVars: { [key: string]: any } = { required: [], optional: [] };

    for (const def of ast.definitions) {
        if ('variableDefinitions' in def && def.variableDefinitions) {
            for (const v of def.variableDefinitions) {
                if (v.type.kind === 'NonNullType') {
                    foundVars['required'].push(v.variable.name.value);
                } else {
                    foundVars['optional'].push(v.variable.name.value);
                }
            }
        }
    }
    foundVars['query'] = content.toString();
    return foundVars;
}


// Define a generic type for the GraphQL response data
interface GraphQLResponse<T> {
    data?: T;
    errors?: any[];
}

/**
 * Executes a GraphQL query or mutation against the Infrahub API.
 * @param query The GraphQL query string (e.g., `query { Branch { name } }`).
 * @param variables Optional variables for the GraphQL query/mutation.
 * @returns A Promise that resolves with the 'data' part of the GraphQL response, or rejects with an error.
 */
export async function executeGraphQLQuery<T>(
    query: string,
    variables: Record<string, any> = {}, // Default to empty object if no variables
): Promise<T> {
    const config = vscode.workspace.getConfiguration('infrahub');
    const infrahubUrl = config.get<string>('url') || process.env.INFRAHUB_URL || 'http://localhost:8000';
    const infrahubToken = config.get<string>('token') || process.env.INFRAHUB_TOKEN || '';

    const graphqlEndpoint = `${infrahubUrl.replace(/\/+$/, '')}/graphql`;
    const postData = JSON.stringify({ query, variables }); // Include variables in the payload

    const parsedUrl = new URL(graphqlEndpoint);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData).toString(),
        Accept: 'application/json',
    };

    if (infrahubToken) {
        headers['X-INFRAHUB-KEY'] = infrahubToken;
    }

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: headers,
        timeout: 10000, // Increased timeout for general GraphQL operations
    };

    return new Promise<T>((resolve, reject) => {
        const req = client.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const jsonResponse: GraphQLResponse<T> = JSON.parse(data);

                        if (jsonResponse.errors) {
                            const errorMessages = jsonResponse.errors
                                .map((err) => err.message || JSON.stringify(err))
                                .join('\n');
                            console.error(`Infrahub GraphQL errors: ${errorMessages}`);
                            reject(new Error(`GraphQL Errors: ${errorMessages}`));
                            return;
                        }

                        if (jsonResponse.data) {
                            resolve(jsonResponse.data); // Resolve with only the 'data' part
                        } else {
                            reject(new Error('GraphQL response did not contain a data payload.'));
                        }
                    } catch (parseError: any) {
                        console.error(
                            `Failed to parse JSON response from ${graphqlEndpoint}: ${parseError.message}`,
                            data,
                        );
                        reject(new Error(`JSON Parse Error: ${parseError.message}`));
                    }
                } else {
                    const errorMessage = `HTTP Error ${res.statusCode}: ${data}`;
                    console.error(`Infrahub GraphQL request failed: ${errorMessage}`);
                    reject(new Error(errorMessage));
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with GraphQL request to ${graphqlEndpoint}: ${e.message}`);
            reject(new Error(`Network Error: ${e.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            console.error(`Timeout connecting to Infrahub at ${graphqlEndpoint}`);
            reject(new Error('Connection Timeout'));
        });

        req.write(postData);
        req.end();
    });
}

export async function promptForVariables(
    variableNames: string[],
    required: boolean = false,
): Promise<Record<string, string | undefined>> {
    const result: Record<string, string | undefined> = {};
    for (const name of variableNames) {
        let value = await vscode.window.showInputBox({
            prompt: `Enter value for variable "${name}"`,
            ignoreFocusOut: true,
        });
        if (required && !value) {
            while (!value) {
                vscode.window.showErrorMessage(`Variable "${name}" is required.`);
                value = await vscode.window.showInputBox({
                    prompt: `${name} is required. Enter value for variable "${name}"`,
                    ignoreFocusOut: true,
                });
            }
        }
        result[name] = value;
    }
    return result;
}