// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fs from 'fs';
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
export function parseGraphQLQuery(path: string): { [key: string]: string[] } {
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
    foundVars['query'] = content;
    return foundVars;
}
