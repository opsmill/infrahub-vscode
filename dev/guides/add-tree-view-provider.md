# How to Add a Tree View Provider

## Overview

Tree views display hierarchical data in the Infrahub sidebar. The extension has three tree views; follow this pattern to add more.

## Steps

### 1. Define the view in package.json

Add to `contributes.views.infrahubContainer`:

```json
{
  "id": "infrahubYourTreeView",
  "name": "Your View Name",
  "icon": "media/otter-icon-black.svg"
}
```

### 2. Create the provider class

Create `src/treeview/YourTreeViewProvider.ts`:

```typescript
import * as vscode from 'vscode';

class YourTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.contextValue = 'yourItemType'; // Used for menu when clauses
  }
}

export class YourTreeViewProvider implements vscode.TreeDataProvider<YourTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<YourTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: YourTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: YourTreeItem): Promise<YourTreeItem[]> {
    if (!element) {
      // Return root items
      return [];
    }
    // Return children of element
    return [];
  }
}
```

### 3. Register in extension.ts

```typescript
const yourProvider = new YourTreeViewProvider();
vscode.window.registerTreeDataProvider('infrahubYourTreeView', yourProvider);
```

### 4. Add auto-refresh (optional)

```typescript
const refreshInterval = setInterval(() => yourProvider.refresh(), 10000);
context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });
```

### 5. Add context menu items

Add commands to `package.json` `menus.view/item/context` using `viewItem` to target specific tree items.
