// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fs from 'fs';
import { fileExists } from '../common/utilities';
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
    transformation?: { [key: string]: any } = undefined;
    transform_type?: string = undefined;

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
        console.log('Infrahub: Initializing Infrahub YAML Tree View Provider');
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (this.workspaceRoot) {
            this.initInfrahubFileWatcher(context);
        }
    }

    private async initInfrahubFileWatcher(context: vscode.ExtensionContext) {
        await this.updateInfrahubFile();

        // Dispose previous watcher if any
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }

        // Only watch the file that actually exists
        if (this.infrahubFile) {
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(this.infrahubFile);
            this.fileWatcher.onDidChange(async () => {
                this.refresh();
            });
            this.fileWatcher.onDidDelete(async () => {
                await this.updateInfrahubFile();
                await this.initInfrahubFileWatcher(context);
                this.refresh();
            });
            this.fileWatcher.onDidCreate(async () => {
                await this.updateInfrahubFile();
                await this.initInfrahubFileWatcher(context);
                this.refresh();
            });
            context.subscriptions.push(this.fileWatcher);
        }

        this.refresh();
    }

    private async updateInfrahubFile() {
        const ymlPath = path.join(this.workspaceRoot!, '.infrahub.yml');
        const yamlPath = path.join(this.workspaceRoot!, '.infrahub.yaml');
        if (await fileExists(vscode.Uri.file(ymlPath))) {
            this.infrahubFile = ymlPath;
        } else if (await fileExists(vscode.Uri.file(yamlPath))) {
            this.infrahubFile = yamlPath;
        } else {
            this.infrahubFile = undefined;
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InfrahubYamlTreeItem): InfrahubYamlTreeItem {
        return element;
    }

    async getChildren(element?: InfrahubYamlTreeItem): Promise<InfrahubYamlTreeItem[]> {
        if (!this.workspaceRoot || !this.infrahubFile) {
            return [];
        }
        if (!element) {
            // Top-level: show keys from .infrahub.yml
            return await this.getKeys();
        } else {
            // For each key, show its values as children
            return await this.getValues(element.label);
        }
    }

    private async getKeys(): Promise<InfrahubYamlTreeItem[]> {
        if (!this.infrahubFile) {
            return [
                new InfrahubYamlTreeItem(
                    '❌ Could not find .infrahub.yml/yaml file ❌',
                    vscode.TreeItemCollapsibleState.None,
                ),
            ];
        }
        try {
            await fs.promises.access(this.infrahubFile, fs.constants.F_OK);
        } catch {
            return [
                new InfrahubYamlTreeItem(
                    '❌ Could not find .infrahub.yml/yaml file ❌',
                    vscode.TreeItemCollapsibleState.None,
                ),
            ];
        }
        try {
            const fileContents = await fs.promises.readFile(this.infrahubFile, 'utf8');
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
                    console.log(treeItem);
                    return treeItem;
                });
                return items;
            }
        } catch (e) {
            console.error('Error in getKeys with yaml-ast-parser:', e);
        }
        return [];
    }

    private async getValues(key: string): Promise<InfrahubYamlTreeItem[]> {
        console.log(`Infrahub: Getting values for key: ${key}`);
        if (!this.infrahubFile) {
            return [];
        }
        
        try {
            await fs.promises.access(this.infrahubFile, fs.constants.F_OK);
        } catch {
            return [];
        }
        
        try {
            const fileContents = await fs.promises.readFile(this.infrahubFile, 'utf8');
            const ast = load(fileContents);

            if (!ast || ast.kind !== 2 /* MAP */) {
                return [];
            }

            const rootMap = ast as YamlMap;
            const mapping = rootMap.mappings.find((m: YAMLMapping) => m.key.value === key);
            
            if (!mapping?.value || mapping.value.kind !== 3 /* SEQ */) {
                return [];
            }

            const seq = mapping.value as YAMLSequence;
            const items = await Promise.all(seq.items.map(async (item: YAMLNode) => {
                return this.createTreeItemFromYamlNode(item, key, fileContents, ast);
            }));
            
            return items;
        } catch (e) {
            console.error('Error in getValues:', e);
            return [];
        }
    }

    /**
     * Creates a tree item from a YAML node with appropriate context and metadata
     */
    private async createTreeItemFromYamlNode(
        item: YAMLNode, 
        key: string, 
        fileContents: string, 
        ast: any
    ): Promise<InfrahubYamlTreeItem> {
        const line = fileContents.substring(0, item.startPosition).split('\n').length;
        const { label, file_path } = this.extractBasicProperties(item);
        
        const itemNode = new InfrahubYamlTreeItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            this.infrahubFile,
            line,
        );

        // Set common properties
        itemNode.tooltip = this.createTooltip(fileContents, item);
        itemNode.command = this.createEditCommand(itemNode);

        // Apply key-specific processing
        await this.applyKeySpecificProcessing(itemNode, key, item, ast, file_path);

        console.log(`Infrahub: Created tree item for value: ${label} at line ${line}`, itemNode);
        return itemNode;
    }

    /**
     * Extracts basic properties (name, file_path) from a YAML map item
     */
    private extractBasicProperties(item: YAMLNode): { label: string; file_path?: string } {
        let label = 'item';
        let file_path: string | undefined;

        if (item.kind === 2 /* MAP */) {
            const mapItem = item as YamlMap;
            const nameMapping = mapItem.mappings.find((m: YAMLMapping) => m.key.value === 'name');
            const pathMapping = mapItem.mappings.find((m: YAMLMapping) => m.key.value === 'file_path');
            
            if (nameMapping?.value) {
                label = nameMapping.value.value;
            }
            if (pathMapping?.value) {
                file_path = pathMapping.value.value;
            }
        }

        return { label, file_path };
    }

    /**
     * Creates tooltip for tree item
     */
    private createTooltip(fileContents: string, item: YAMLNode): vscode.MarkdownString {
        const yamlContent = fileContents.substring(
            Math.max(0, item.startPosition - 4), 
            item.endPosition
        ).trim();
        return new vscode.MarkdownString(`\`\`\`yaml\n${yaml.stringify(yamlContent)}\`\`\``);
    }

    /**
     * Creates edit command for tree item
     */
    private createEditCommand(itemNode: InfrahubYamlTreeItem): vscode.Command {
        return {
            command: 'infrahub.editInfrahubYaml',
            title: 'Edit in .infrahub.yml',
            arguments: [itemNode],
        };
    }

    /**
     * Applies key-specific processing to tree items
     */
    private async applyKeySpecificProcessing(
        itemNode: InfrahubYamlTreeItem,
        key: string,
        item: YAMLNode,
        ast: any,
        file_path?: string
    ): Promise<void> {
        switch (key) {
            case 'queries':
                await this.processQueriesItem(itemNode, file_path);
                break;
            case 'jinja2_transforms':
            case 'python_transforms':
                this.processTransformItem(itemNode, key, item);
                break;
            case 'artifact_definitions':
                this.processArtifactDefinitionItem(itemNode, item, ast);
                break;
        }
    }

    /**
     * Processes query items with GraphQL parsing
     */
    private async processQueriesItem(itemNode: InfrahubYamlTreeItem, file_path?: string): Promise<void> {
        if (!file_path) {
            return;
        }

        const absolutePath = path.join(this.workspaceRoot || '', file_path);
        itemNode.gqlFilePath = absolutePath;
        itemNode.gqlInfo = await parseGraphQLQuery(absolutePath);
        itemNode.contextValue = 'queries';
        console.log('Parsed GraphQL query variables:', itemNode.gqlInfo);
    }

    /**
     * Processes transform items (jinja2_transforms and python_transforms)
     */
    private processTransformItem(itemNode: InfrahubYamlTreeItem, key: string, item: YAMLNode): void {
        if (item.kind !== 2 /* MAP */) {
            return;
        }

        const mapItem = item as YamlMap;
        const nameMapping = mapItem.mappings.find((m: YAMLMapping) => m.key.value === 'name');
        
        if (!nameMapping?.value) {
            return;
        }

        itemNode.contextValue = 'transforms';
        itemNode.transform_type = key === 'jinja2_transforms' ? 'jinja' : 'python';
        itemNode.transformation = { name: nameMapping.value.value };
    }

    /**
     * Processes artifact definition items with transform type detection
     */
    private processArtifactDefinitionItem(itemNode: InfrahubYamlTreeItem, item: YAMLNode, ast: any): void {
        if (item.kind !== 2 /* MAP */) {
            return;
        }

        const mapItem = item as YamlMap;
        const transformationMapping = mapItem.mappings.find((m: YAMLMapping) => m.key.value === 'transformation');
        
        if (!transformationMapping?.value) {
            return;
        }

        const transformationName = transformationMapping.value.value;
        itemNode.contextValue = 'transforms';
        itemNode.transformation = { name: transformationName };
        itemNode.transform_type = this.getTransformType(transformationName, ast);
        
        // Update label to show transform type
        if (itemNode.transform_type) {
            itemNode.label = `${itemNode.label} (${itemNode.transform_type})`;
        }
        
        console.log('Determined transformation and type:', itemNode);
    }

    /**
     * Determines the transform type (python or jinja) by searching for the transformation name
     * in the python_transforms or jinja2_transforms sections of the YAML file
     */
    private getTransformType(transformationName: string, ast: any): string | undefined {
        if (!ast || ast.kind !== 2 /* MAP */) {
            return undefined;
        }

        const rootMap = ast as YamlMap;
        const transformSections = [
            { key: 'python_transforms', type: 'python' },
            { key: 'jinja2_transforms', type: 'jinja' }
        ];

        for (const section of transformSections) {
            const sectionMapping = rootMap.mappings.find((m: YAMLMapping) => m.key.value === section.key);
            
            if (sectionMapping?.value?.kind === 3 /* SEQ */) {
                const sequence = sectionMapping.value as YAMLSequence;
                const found = sequence.items.some((item: YAMLNode) => {
                    if (item.kind !== 2 /* MAP */) {
                        return false;
                    }
                    const mapItem = item as YamlMap;
                    const nameMapping = mapItem.mappings.find((m: YAMLMapping) => m.key.value === 'name');
                    return nameMapping?.value?.value === transformationName;
                });
                
                if (found) {
                    return section.type;
                }
            }
        }

        return undefined;
    }
}
