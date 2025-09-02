// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { YAMLSequence, YamlMap } from 'yaml-ast-parser';
import { searchForConfigSchemaFiles } from '../common/infrahub';

export class InfrahubSchemaTreeItem extends vscode.TreeItem {
    label: string;
    filePath?: string = undefined;
    lineNumber?: number = undefined;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        filePath?: string,
        lineNumber?: number,
    ) {
        super(label, collapsibleState);
        this.label = label;
        this.filePath = filePath;
        this.lineNumber = lineNumber;
    }
}

export class InfrahubSchemaProvider implements vscode.TreeDataProvider<InfrahubSchemaTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InfrahubSchemaTreeItem | undefined | void> =
        new vscode.EventEmitter<InfrahubSchemaTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<InfrahubSchemaTreeItem | undefined | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InfrahubSchemaTreeItem): InfrahubSchemaTreeItem {
        return element;
    }

    getChildren(element?: InfrahubSchemaTreeItem): Thenable<InfrahubSchemaTreeItem[]> {
        if (!element) {
            // Top-level: show keys from schema file
            return this.getKeys();
        } else {
            // For each key, show its values as children
            return this.getValues(element.label);
        }
    }

    private getKeys(): Thenable<InfrahubSchemaTreeItem[]> {
        return new Promise((resolve) => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showWarningMessage('Please open a folder or workspace in VS Code.');
                    resolve([]);
                    return;
                }
                const items: InfrahubSchemaTreeItem[] = [];
                const foundFiles = searchForConfigSchemaFiles();
                console.log('Found schema files:', foundFiles);
                if (!foundFiles || Object.keys(foundFiles).length === 0) {
                    console.error('No schema files found. Please check your configuration.');
                    resolve([]);
                    return;
                }
                for (const filePath in foundFiles) {
                    const label = path.relative(workspaceRoot, filePath); // Use just the filename as the label

                    items.push(
                        new InfrahubSchemaTreeItem(
                            label,
                            vscode.TreeItemCollapsibleState.Collapsed, // No children for now, so no collapse/expand icon
                            filePath,
                        ),
                    );
                }
                resolve(items);
                return;
            } catch (e) {
                console.error('Error in getKeys:', e);
                resolve([]);
            }
        });
    }

    private getValues(key: string): Thenable<InfrahubSchemaTreeItem[]> {
        return new Promise((resolve) => {
            const foundFiles = searchForConfigSchemaFiles();
            try {
                // foundFiles[key] should be the file path for the YAML document
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showWarningMessage('Please open a folder or workspace in VS Code.');
                    resolve([]);
                    return;
                }
                const absolutePathToKey = path.join(workspaceRoot, key);
                const doc = foundFiles[absolutePathToKey] as YamlMap;
                const contents = fs.readFileSync(absolutePathToKey, 'utf8');

                // Iterate over top-level keys, skipping 'version' and 'extensions'
                const items: InfrahubSchemaTreeItem[] = [];

                if (!doc) {
                    console.error(`No document found for key: ${key}`);
                    resolve([]);
                    return;
                }
                if (doc && doc.kind === 2 && Array.isArray(doc.mappings)) {
                    for (const mapping of doc.mappings) {
                        if (mapping.key.value === 'version' || mapping.key.value === 'extensions') {
                            continue; // Skip 'version' and 'extensions'
                        }
                        if (mapping && mapping.value && mapping.value.kind === 3 /* SEQ */) {
                            const seq = mapping.value as YAMLSequence;
                            for (const item of seq.items) {
                                let namespace = '';
                                let name = '';

                                // item is a YamlMap (kind === 2)
                                if (item.kind === 2 && Array.isArray(item.mappings)) {
                                    for (const mapping of item.mappings) {
                                        const key = mapping.key.value;
                                        if (key === 'namespace') {
                                            namespace = mapping.value.value || '';
                                        } else if (key === 'name') {
                                            name = mapping.value.value || '';
                                        }
                                    }
                                }

                                const label = `${namespace}${name} (${mapping.key.value.slice(0, -1)})`; // Remove trailing 's' from 'nodes'
                                const line = contents.substring(0, item.startPosition).split('\n').length;
                                const itemNode = new InfrahubSchemaTreeItem(
                                    label,
                                    vscode.TreeItemCollapsibleState.None,
                                    absolutePathToKey,
                                    line,
                                );
                                itemNode.tooltip = new vscode.MarkdownString(
                                    `\`\`\`yaml${yaml.stringify(contents.substring(item.startPosition - 4, item.endPosition).trim())}\n`,
                                );
                                itemNode.command = {
                                    command: 'infrahub.editInfrahubYaml',
                                    title: 'Edit schema',
                                    arguments: [itemNode],
                                };
                                items.push(itemNode);
                            }
                        }
                    }
                }
                resolve(items);
                return;
            } catch (e) {
                console.error('Error in getValues:', e);
                resolve([]);
            }
        });
    }
}
