# How to Add a New Command

## Overview

Commands are the primary way users interact with the extension. Each command has a registration in `package.json`, a handler in `common/commands.ts`, and wiring in `extension.ts`.

## Steps

### 1. Define the command in package.json

Add to `contributes.commands`:

```json
{
  "command": "infrahub.yourCommand",
  "title": "Your Command Title",
  "icon": "$(icon-name)",
  "category": "Infrahub"
}
```

[VSCode icon reference](https://code.visualstudio.com/api/references/icons-in-labels)

### 2. Add menu contributions (optional)

Add to the appropriate `menus` section in `package.json`:

```json
"view/item/context": [
  {
    "command": "infrahub.yourCommand",
    "when": "view == infrahubServerTreeView && viewItem == infrahubServer:online",
    "group": "inline"
  }
]
```

The `when` clause controls visibility. Use `viewItem` to match tree item context values.

### 3. Implement the handler

Add the function to `src/common/commands.ts`:

```typescript
export async function yourCommand(item: YourTreeItem): Promise<void> {
  // Use utilities for user interaction:
  // - showErrorMessage, showInfoMessage from utilities.ts
  // - promptForServer, promptForBranch from utilities.ts
  // - executeInfrahubCtl for CLI operations
}
```

### 4. Register in extension.ts

Add to the `activate()` function:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('infrahub.yourCommand', (item) =>
    yourCommand(item)
  )
);
```

### 5. Test

1. Run `npm run compile`
2. Press F5 to launch Extension Development Host
3. Verify the command appears in the Command Palette
4. Verify context menu placement (if applicable)
5. Test the command execution
