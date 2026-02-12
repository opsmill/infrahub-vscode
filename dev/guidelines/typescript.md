# TypeScript Guidelines

## Compiler Settings

- **Strict mode** is enabled - all code must pass strict checks
- **Target:** ES2022
- **Module:** Node16
- **No bundler** - plain `tsc` compilation to `out/`

## Conventions

### File Naming
- PascalCase for classes/providers: `InfrahubServerTreeViewProvider.ts`
- camelCase for utilities: `utilities.ts`, `commands.ts`
- Test files: `*.test.ts` in `src/test/`

### Imports
- Use Node16 module resolution
- Import VSCode API as `import * as vscode from 'vscode'`
- Import SDK types from `infrahub-sdk`

### Error Handling
- Use `vscode.window.showErrorMessage()` for user-facing errors
- Use `vscode.window.showWarningMessage()` for warnings
- API calls should have timeout handling (see server tree view for pattern)

### Disposables
- All disposables (event listeners, providers) must be added to `context.subscriptions` in `extension.ts`
- Clean up intervals and timers in `deactivate()`

### Tree View Providers
- Implement `vscode.TreeDataProvider<T>`
- Define a custom TreeItem subclass when needed
- Use `contextValue` to control menu visibility (see `package.json` `menus` section)
- Refresh via `onDidChangeTreeData` event

### Commands
- Register in `extension.ts` with `vscode.commands.registerCommand()`
- Implement in `common/commands.ts`
- Use utility functions from `common/utilities.ts` for user interaction

## Linting

ESLint is configured in `eslint.config.mjs`. Run with:

```bash
npm run lint
```

## Testing

Tests use `@vscode/test-cli` and run in an Extension Development Host:

```bash
npm run test
```

Test files go in `src/test/`. The test runner expects compiled JS in `out/test/`.
