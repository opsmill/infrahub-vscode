# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Infrahub VSCode Extension - a Visual Studio Code extension that provides development tools for working with Infrahub, an open-source infrastructure automation platform. The extension connects to Infrahub servers and provides YAML schema support, GraphQL query execution, and branch management.

## Development Commands

### Build and Compile
```bash
npm run compile       # Compile TypeScript to JavaScript (output to out/)
npm run watch        # Compile in watch mode for development
```

### Linting
```bash
npm run lint         # Run ESLint on src/ directory
```

### Testing
```bash
npm run test         # Run tests with vscode-test
npm run pretest      # Compile and lint before testing
```

### Publishing
```bash
npm run vscode:prepublish  # Prepare for publishing (runs compile)
npm run deploy             # Publish extension using vsce
```

### Development Workflow
```bash
# Start development with watch mode
npm run watch

# Run extension in VSCode (F5 or use launch.json configuration)
# This opens a new VSCode window with the extension loaded
```

## Architecture

### Extension Entry Point
- `src/extension.ts` - Main activation point that registers all providers, commands, and views

### Core Components

1. **Tree View Providers** (`src/treeview/`)
   - `InfrahubServerTreeViewProvider.ts` - Manages server connections and displays branches
   - `infrahubYamlTreeViewProvider.ts` - Visualizes .infrahub.yml/.yaml file structure

2. **Language Features**
   - `YamlDefinitionProvider.ts` - Go-to-definition for YAML schema references
   - `YamlDocumentSymbolProvider.ts` - Document symbols/outline for YAML files

3. **Common Utilities** (`src/common/`)
   - `commands.ts` - Command implementations (GraphQL execution, branch management)
   - `infrahub.ts` - Infrahub-specific utilities and helpers
   - `utilities.ts` - General utility functions

### Key Dependencies
- `infrahub-sdk` - Official SDK for interacting with Infrahub servers
- `yaml` - YAML parsing and manipulation
- `graphql` - GraphQL query handling

### Extension Configuration
The extension uses VSCode settings to store:
- `infrahub-vscode.servers` - Array of server configurations with name, address, and optional API token
- `infrahub-vscode.schemaDirectory` - Path to schema files directory

### Extension Activation
Activates when workspace contains `.infrahub.yml` or `.infrahub.yaml` files

### Status Bar
Updates every 10 seconds showing Infrahub server version and connection status

### Tree Views
- **Infrahub Servers** - Shows configured servers and their branches, refreshes every 10 seconds
- **Infrahub YAML** - Displays structure of Infrahub YAML configuration files

## TypeScript Configuration

- Target: ES2022
- Module: Node16
- Strict mode enabled
- Source maps enabled for debugging
- Output directory: `out/`

## Development Notes

### Environment Variable Substitution
Server API tokens support environment variable substitution using `${env:VAR_NAME}` syntax

### GraphQL Query Execution
Queries can be executed from the tree view with:
- Required and optional variable prompting
- Server and branch selection
- Results displayed in webview panel

### Branch Management
Supports creating and deleting branches directly from the extension UI

### YAML Schema Validation
Automatically validates YAML files in `models/` and `schemas/` directories against Infrahub schema