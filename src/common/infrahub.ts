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
export async function parseGraphQLQuery(path: string): Promise<{ [key: string]: any }> {
    const content = fs.readFileSync(path, 'utf8');
    const ast = parse(content);
    const foundVars: { [key: string]: any } = { required: [], optional: [] };

    function getTypeName(typeNode: any): string {
        if (typeNode.kind === 'NonNullType' || typeNode.kind === 'ListType') {
            return getTypeName(typeNode.type);
        }
        // NamedType
        return typeNode.name.value;
    }

    for (const def of ast.definitions) {
        if ('variableDefinitions' in def && def.variableDefinitions) {
            for (const v of def.variableDefinitions) {
                const varName = v.variable.name.value;
                const varType = getTypeName(v.type);
                if (v.type.kind === 'NonNullType') {
                    foundVars['required'].push({ name: varName, type: varType });
                } else {
                    foundVars['optional'].push({ name: varName, type: varType });
                }
            }
        }
    }
    foundVars['query'] = content.toString();
    console.log(JSON.stringify(foundVars, null, 2));
    return foundVars;
}

export async function promptForVariables(
    variableTypes: { [key: string]: any }[],
    required: boolean = false,
): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const varDef of variableTypes) {
        const name = varDef['name'];
        const type = varDef['type'];
        let value: string | undefined = await vscode.window.showInputBox({
            prompt: `Enter value for variable "${name}" (type: ${type})`,
            ignoreFocusOut: true,
        });
        while (required && !value) {
            vscode.window.showErrorMessage(`Variable "${name}" is required.`);
            value = await vscode.window.showInputBox({
                prompt: `${name} is required. Enter value for variable "${name}" (type: ${type})`,
                ignoreFocusOut: true,
            });
        }
        result[name] = value !== undefined ? castVariableValue(type, value) : undefined;
    }
    return result;
}

function castVariableValue(type: string, value: string): any {
    switch (type) {
        case 'Int':
            return parseInt(value, 10);
        case 'Float':
            return parseFloat(value);
        case 'Boolean':
            return value.toLowerCase() === 'true';
        case 'String':
            return value;
        default:
            return value; // fallback for custom scalars or enums
    }
}