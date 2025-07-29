import * as vscode from 'vscode';
import { parseDocument, YAMLSeq } from 'yaml';

export class YamlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  async provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[]> {
    const content = document.getText();
    const doc = parseDocument(content);
    const symbols: vscode.DocumentSymbol[] = [];

    for (const key of ['nodes', 'generics']) {
      const seq = doc.get(key);
      if (seq instanceof YAMLSeq) {
        const children: vscode.DocumentSymbol[] = [];
        for (const item of seq.items) {
          const name = item.get('name');
          const namespace = item.get('namespace');
          const description = item.get('description');
          const label = item.get('label');
          const attributes = item.get('attributes');
          const relationships = item.get('relationships');
          if (name && namespace && item.range) {
            const startOffset = item.range[0];
            const preContent = content.slice(0, startOffset);
            const nodeLine = preContent.split(/\r?\n/).length - 1;
            const range = new vscode.Range(nodeLine, 0, nodeLine, 100);
            const symbolLabel = label ? `${namespace}${name} (${label})` : `${namespace}${name}`;
            const detail = description || '';
            const nodeSymbol = new vscode.DocumentSymbol(symbolLabel, detail, vscode.SymbolKind.Object, range, range);

            // Add attributes as a parent with children
            if (attributes instanceof YAMLSeq && attributes.items.length > 0) {
              const attrParent = new vscode.DocumentSymbol('Attributes', '', vscode.SymbolKind.Module, range, range);
              for (const attr of attributes.items) {
                const attrName = attr.get('name');
                const attrKind = attr.get('kind');
                const attrLabel = attr.get('label') || attrName;
                const attrDetail = attrKind ? `Kind: ${attrKind}` : '';
                // Try to get the line number for the attribute
                let attrLine = nodeLine;
                if (attr.range) {
                  const attrStartOffset = attr.range[0];
                  const attrPreContent = content.slice(0, attrStartOffset);
                  attrLine = attrPreContent.split(/\r?\n/).length - 1;
                }
                const attrRange = new vscode.Range(attrLine, 0, attrLine, 100);
                attrParent.children.push(new vscode.DocumentSymbol(attrLabel, attrDetail, vscode.SymbolKind.Field, attrRange, attrRange));
              }
              nodeSymbol.children.push(attrParent);
            }
            // Add relationships as a parent with children
            if (relationships instanceof YAMLSeq && relationships.items.length > 0) {
              const relParent = new vscode.DocumentSymbol('Relationships', '', vscode.SymbolKind.Module, range, range);
              for (const rel of relationships.items) {
                const relName = rel.get('name');
                const relPeer = rel.get('peer');
                const relKind = rel.get('kind');
                const relLabel = relName ? `Rel: ${relName}` : 'Relationship';
                const relDetail = relPeer ? `Peer: ${relPeer}${relKind ? ', Kind: ' + relKind : ''}` : '';
                // Try to get the line number for the relationship
                let relLine = nodeLine;
                if (rel.range) {
                  const relStartOffset = rel.range[0];
                  const relPreContent = content.slice(0, relStartOffset);
                  relLine = relPreContent.split(/\r?\n/).length - 1;
                }
                const relRange = new vscode.Range(relLine, 0, relLine, 100);
                relParent.children.push(new vscode.DocumentSymbol(relLabel, relDetail, vscode.SymbolKind.Interface, relRange, relRange));
              }
              nodeSymbol.children.push(relParent);
            }
            children.push(nodeSymbol);
          }
        }
        if (children.length > 0) {
          const parentSymbol = new vscode.DocumentSymbol(key, '', vscode.SymbolKind.Array, children[0].range, children[0].range);
          parentSymbol.children = children;
          symbols.push(parentSymbol);
        }
      }
    }
    return symbols;
  }
}
