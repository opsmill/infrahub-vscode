# Extension Architecture

## Overview

The Infrahub VSCode Extension provides development tools for Infrahub, an infrastructure automation platform. It connects to Infrahub servers and provides YAML schema support, GraphQL query execution, branch management, and schema visualization.

## Entry Point

`src/extension.ts` is the main activation point. It:
1. Configures TLS settings from server configuration
2. Creates tree view providers (servers, schema, YAML)
3. Registers all commands
4. Registers language feature providers (definition, symbols)
5. Sets up status bar with 10-second refresh interval
6. Sets up tree view auto-refresh (10-second interval)

## Activation

The extension activates when the workspace contains `.infrahub.yml` or `.infrahub.yaml` files (configured in `package.json` `activationEvents`).

## Component Map

```
src/
├── extension.ts                          # Entry point, wiring
├── YamlDefinitionProvider.ts             # Go-to-definition for schema refs
├── YamlDocumentSymbolProvider.ts         # Document outline for YAML
├── common/
│   ├── commands.ts                       # All command implementations
│   ├── infrahub.ts                       # Schema discovery, GraphQL helpers
│   └── utilities.ts                      # Dialogs, terminal, HTML generation
├── treeview/
│   ├── InfrahubServerTreeViewProvider.ts # Server connections & branches
│   ├── infrahubSchemaTreeViewProvider.ts # Schema file navigation
│   └── infrahubYamlTreeViewProvider.ts   # .infrahub.yml structure
├── webview/
│   ├── SchemaVisualizerPanel.ts          # Interactive schema graph
│   └── schemaTypes.ts                    # TypeScript types for schemas
└── test/
    └── extension.test.ts                 # Test suite
```

## Key Patterns

### Command Registration
Commands are registered in `extension.ts` and implemented in `common/commands.ts`. Each command function receives the context it needs (tree items, SDK clients) via closures.

### Tree View Data Flow
Tree view providers implement `vscode.TreeDataProvider<T>`. They fetch data from Infrahub servers via `infrahub-sdk` and transform it into `vscode.TreeItem` instances. Auto-refresh runs every 10 seconds.

### Language Features
`YamlDefinitionProvider` and `YamlDocumentSymbolProvider` implement VSCode language provider interfaces. They parse YAML files to provide go-to-definition and document outline features for schema references.

### Webview Panels
`SchemaVisualizerPanel` creates a webview that loads the `infrahub-schema-visualizer` package for interactive schema graph display.

## Configuration

Two VSCode settings (defined in `package.json`):
- `infrahub-vscode.servers` - Array of server configs: `{name, address, api_token?, tls_insecure?}`
- `infrahub-vscode.schemaDirectory` - Path to schema files (default: `"schemas"`)

API tokens support `${env:VAR_NAME}` syntax for environment variable substitution.

## Dependencies

| Package | Purpose |
|---------|---------|
| `infrahub-sdk` | Server API communication |
| `yaml` | YAML parsing and stringification |
| `yaml-ast-parser` | AST-based YAML parsing with line numbers |
| `graphql` | GraphQL query parsing and variable extraction |
| `infrahub-schema-visualizer` | Interactive schema visualization webview |
| `@vscode/python-extension` | Python environment detection for transforms |

## Build

Plain TypeScript compilation (`tsc`), no bundler. See [ADR-0001](../adr/0001-plain-tsc-over-bundler.md).
- Source: `src/` (TypeScript, strict mode, ES2022 target, Node16 modules)
- Output: `out/` (JavaScript with source maps)
