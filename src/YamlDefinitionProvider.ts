import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseDocument } from 'yaml';

export class YamlDefinitionProvider implements vscode.DefinitionProvider {
  private schemaDirectory: string;

  constructor(schemaDirectory: string) {
    // If relative, resolve from workspace root
    if (!path.isAbsolute(schemaDirectory)) {
      const folders = vscode.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        this.schemaDirectory = path.join(folders[0].uri.fsPath, schemaDirectory);
      } else {
        this.schemaDirectory = schemaDirectory;
      }
    } else {
      this.schemaDirectory = schemaDirectory;
    }
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }
    const word = document.getText(wordRange);
    console.log(`Infrahub: Looking up definition for: ${word} in schema directory: ${this.schemaDirectory}`);

    // Recursively find all yaml files in schemaDirectory and subfolders
    function findYamlFiles(dir: string): string[] {
      let results: string[] = [];
      try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(findYamlFiles(fullPath));
          } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            results.push(fullPath);
          }
        }
      } catch (err) {
        console.error('Infrahub: Failed to read directory', dir, err);
      }
      return results;
    }
    let files: string[] = findYamlFiles(this.schemaDirectory);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const doc = parseDocument(content);
        // Search for both 'nodes' and 'generics' arrays
        for (const key of ['nodes', 'generics']) {
          const seq = doc.get(key);
          // Check if seq is a YAML sequence (has 'items' property as an array)
          if (seq && typeof seq === 'object' && Array.isArray((seq as any).items)) {
            for (const item of (seq as any).items) {
              // item is a YAMLMap
              const nodeName = item.get('name');
              const nodeNamespace = item.get('namespace');
              if (
                (nodeNamespace?.toLowerCase() + nodeName?.toLowerCase()) === word.toLowerCase()
              ) {
                // item.range gives [start, end, valueStart] offsets
                const startOffset = item.range ? item.range[0] : 0;
                // Convert offset to line number
                const preContent = content.slice(0, startOffset);
                const nodeLine = preContent.split(/\r?\n/).length - 1;
                const uri = vscode.Uri.file(file);
                const pos = new vscode.Position(nodeLine, 0);
                return new vscode.Location(uri, pos);
              }
            }
          }
        }
      } catch (err) {
        console.error('Infrahub: Failed to parse yaml file', file, err);
      }
    }
    return undefined;
  }
}
