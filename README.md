# Infrahub VSCode Extension

A Visual Studio Code extension that enhances the development experience for [Infrahub](https://github.com/opsmill/infrahub) - the open-source infrastructure automation platform. This extension provides intelligent tooling for working with Infrahub schemas, GraphQL queries, and configuration files.

## Overview

The Infrahub VSCode Extension streamlines infrastructure-as-code development by providing real-time connectivity to Infrahub servers, schema validation, GraphQL query execution, and branch management capabilities directly within your IDE. Whether you're defining infrastructure models, writing automation queries, or managing schema versions across branches, this extension accelerates your workflow and reduces context switching.

## Use Cases

- **Schema Development**: Create and validate Infrahub schemas with real-time feedback and auto-completion
- **GraphQL Query Testing**: Write and execute GraphQL queries against live Infrahub instances without leaving VSCode
- **Branch-based Workflows**: Manage infrastructure changes across different branches with Git-like version control
- **Multi-Server Development**: Connect to multiple Infrahub environments (dev, staging, production) simultaneously
- **Infrastructure Modeling**: Develop network device models, data center schemas, and service definitions with YAML validation
- **Automation Development**: Build and test automation workflows that integrate with Infrahub's graph database

## Features

### 🔗 Server Management

- Connect to multiple Infrahub servers with secure API token authentication
- Real-time server status monitoring in the status bar
- Support for environment variable substitution in configuration
- Automatic connection health checks every 10 seconds

### 🌳 Visual Tree Views

- **Infrahub Servers View**: Browse connected servers and their branches
- **Infrahub YAML View**: Navigate `.infrahub.yml` file structure with a hierarchical tree
- Quick actions available directly from tree view context menus

### 📝 YAML Intelligence

- Schema-aware YAML validation for `models/` and `schemas/` directories
- Go-to-definition support for schema references
- Document outline/symbols for easy navigation
- Syntax highlighting and error detection

### ✂️ Snippets for Automation and YAML Objects

- Quickly scaffold Infrahub transforms, scripts, generators, checks, and YAML objects using built-in VSCode snippets
- Reduce manual typing and avoid syntax errors with reusable templates

### 🚀 GraphQL Integration

- Execute GraphQL queries directly from the tree view
- Interactive variable prompting for query parameters
- Branch-aware query execution
- Results displayed in formatted webview panels

### 🔀 Branch Management

- Create new branches from the UI
- Delete branches with confirmation
- View branch metadata (description, origin, schema changes)
- Switch between branches for testing

### 📊 Status Bar Integration

- Live server connection status
- Current server version display
- Visual indicators for connection health

## Installation

### From VSCode Marketplace

1. Open VSCode
2. Navigate to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Infrahub"
4. Click Install on the Infrahub extension by OpsMill

### From VSIX Package

```bash
# Download the latest release
curl -L https://github.com/opsmill/infrahub-vscode/releases/latest/download/infrahub-x.x.x.vsix -o infrahub.vsix

# Install using VSCode CLI
code --install-extension infrahub.vsix
```

### From Source

```bash
# Clone the repository
git clone https://github.com/opsmill/infrahub-vscode.git
cd infrahub-vscode

# Install dependencies
npm install

# Compile and package
npm run compile
npm run vscode:prepublish
vsce package

# Install the generated .vsix file
code --install-extension infrahub-*.vsix
```

## Documentation

- **Infrahub VSCode Extension Documentation**: [Infrahub Docs](https://docs.infrahub.app/vscode)

## Requirements

- Visual Studio Code v1.102.0 or higher
- Active Infrahub server instance (v0.15.0 or higher recommended)
- Valid API token for authentication (optional but recommended)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests to the [GitHub repository](https://github.com/opsmill/infrahub-vscode).

For more details, see the [CONTRIBUTING.md](CONTRIBUTING.md) file.

## License

This extension is part of the Infrahub project. See the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/opsmill/infrahub-vscode/issues)
- **Community**: [Infrahub Discord](https://discord.gg/infrahub)

## Acknowledgments

Built with ❤️ by the [OpsMill](https://opsmill.com) team and the Infrahub community.
