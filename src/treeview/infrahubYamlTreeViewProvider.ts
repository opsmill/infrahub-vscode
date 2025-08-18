// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { load, YAMLMapping, YAMLSequence, YAMLNode, YamlMap } from 'yaml-ast-parser';
import { parseGraphQLQuery } from '../common/infrahub';

export class InfrahubYamlTreeItem extends vscode.TreeItem {
    label: string;
    filePath?: string = undefined;
    lineNumber?: number = undefined;
    gqlFilePath?: string = undefined;
    gqlInfo?: { [key: string]: any } = undefined;

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

export class infrahubTreeViewProvider implements vscode.TreeDataProvider<InfrahubYamlTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InfrahubYamlTreeItem | undefined | void> =
        new vscode.EventEmitter<InfrahubYamlTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<InfrahubYamlTreeItem | undefined | void> =
        this._onDidChangeTreeData.event;
    private workspaceRoot: string | undefined;
    private infrahubFile: string | undefined;
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (this.workspaceRoot) {
            this.infrahubFile = path.join(this.workspaceRoot, '.infrahub.yml');
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this.workspaceRoot, '.infrahub.yml'),
            );
            this.fileWatcher.onDidChange(() => this.refresh());
            this.fileWatcher.onDidCreate(() => this.refresh());
            this.fileWatcher.onDidDelete(() => this.refresh());
            context.subscriptions.push(this.fileWatcher);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InfrahubYamlTreeItem): InfrahubYamlTreeItem {
        return element;
    }

    getChildren(element?: InfrahubYamlTreeItem): Thenable<InfrahubYamlTreeItem[]> {
        if (!this.workspaceRoot || !this.infrahubFile) {
            return Promise.resolve([]);
        }
        if (!element) {
            // Top-level: show keys from .infrahub.yml
            return this.getKeys();
        } else {
            // For each key, show its values as children
            return this.getValues(element.label);
        }
    }

    private getKeys(): Thenable<InfrahubYamlTreeItem[]> {
        return new Promise((resolve) => {
            if (!this.infrahubFile || !fs.existsSync(this.infrahubFile)) {
                resolve([
                    new InfrahubYamlTreeItem(
                        '❌ Could not find .infrahub.yml file ❌',
                        vscode.TreeItemCollapsibleState.None,
                    ),
                ]);
                return;
            }
            try {
                const fileContents = fs.readFileSync(this.infrahubFile, 'utf8');
                const ast = load(fileContents);

                if (ast && ast.kind === 2 /* MAP */) {
                    const rootMap = ast as YamlMap;
                    const items = rootMap.mappings.map((mapping: YAMLMapping) => {
                        const key = mapping.key.value;
                        // Calculate line number for the key
                        const line = fileContents.substring(0, mapping.key.startPosition).split('\n').length;
                        const treeItem = new InfrahubYamlTreeItem(
                            key,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            this.infrahubFile,
                            line,
                        );
                        treeItem.command = {
                            command: 'infrahub.editInfrahubYaml',
                            title: 'Edit in .infrahub.yml',
                            arguments: [treeItem],
                        };
                        return treeItem;
                    });
                    resolve(items);
                    return;
                }
            } catch (e) {
                console.error('Error in getKeys with yaml-ast-parser:', e);
            }
            resolve([]);
        });
    }

    private getValues(key: string): Thenable<InfrahubYamlTreeItem[]> {
        return new Promise((resolve) => {
            if (!this.infrahubFile || !fs.existsSync(this.infrahubFile)) {
                resolve([]);
                return;
            }
            try {
                const fileContents = fs.readFileSync(this.infrahubFile, 'utf8');
                const ast = load(fileContents);

                // Find the mapping for the given key at the root
                if (ast && ast.kind === 2 /* MAP */) {
                    const rootMap = ast as YamlMap;
                    const mapping = rootMap.mappings.find((m: YAMLMapping) => m.key.value === key);
                    if (mapping && mapping.value && mapping.value.kind === 3 /* SEQ */) {
                        const seq = mapping.value as YAMLSequence;
                        const items = seq.items.map((item: YAMLNode) => {
                            // item.startPosition gives the offset in the file
                            const line = fileContents.substring(0, item.startPosition).split('\n').length;
                            // Try to get the 'name' property if it's a mapping
                            let label = 'item';
                            let file_path: string | undefined;
                            if (item.kind === 2 /* MAP */) {
                                const mapItem = item as YamlMap;
                                const nameMapping = mapItem.mappings.find((m: YAMLMapping) => m.key.value === 'name');
                                if (nameMapping && nameMapping.value) {
                                    label = nameMapping.value.value;
                                }
                                const pathMapping = mapItem.mappings.find(
                                    (m: YAMLMapping) => m.key.value === 'file_path',
                                );
                                if (pathMapping && pathMapping.value) {
                                    file_path = pathMapping.value.value;
                                }
                            }
                            const itemNode = new InfrahubYamlTreeItem(
                                label,
                                vscode.TreeItemCollapsibleState.None,
                                this.infrahubFile,
                                line,
                            );
                            itemNode.tooltip = new vscode.MarkdownString(
                                `\`\`\`yaml${yaml.stringify(fileContents.substring(item.startPosition - 4, item.endPosition)).trim()}`,
                            );
                            itemNode.command = {
                                command: 'infrahub.editInfrahubYaml',
                                title: 'Edit in .infrahub.yml',
                                arguments: [itemNode],
                            };
                            if (key === 'queries' && file_path) {
                                const absolutePath = path.join(this.workspaceRoot || '', file_path);
                                itemNode.gqlFilePath = absolutePath;
                                const gqlQueryVars = parseGraphQLQuery(absolutePath);
                                itemNode.gqlInfo = gqlQueryVars;
                                itemNode.contextValue = 'queries';
                                console.log('Parsed GraphQL query variables:', itemNode.gqlInfo);
                            }

                            return itemNode;
                        });
                        resolve(items);
                        return;
                    }
                }
            } catch (e) {
                console.error('Error in getValuesWithAstParser:', e);
            }
            resolve([]);
        });
    }
}
