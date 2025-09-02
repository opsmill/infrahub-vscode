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

## Usage Examples

### Configure Infrahub Servers

1. Open VSCode Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Infrahub"
3. Add server configurations:

```json
{
  "infrahub-vscode.servers": [
    {
      "name": "Development",
      "address": "http://localhost:8000",
      "api_token": "${env:INFRAHUB_DEV_TOKEN}"
    },
    {
      "name": "Production",
      "address": "https://infrahub.example.com",
      "api_token": "your-api-token-here"
    }
  ],
  "infrahub-vscode.schemaDirectory": "schemas"
}
```

### Working with Schemas

Create a new schema file in your `schemas/` directory:

```yaml
# schemas/network.yml
version: '1.0'
nodes:
  - name: Device
    namespace: Network
    attributes:
      - name: hostname
        kind: Text
        unique: true
      - name: model
        kind: Text
    relationships:
      - name: interfaces
        peer: NetworkInterface
        kind: Component
```

The extension will automatically validate the schema and provide IntelliSense support.

### Executing GraphQL Queries

1. Create a query file in your project:

```graphql
# queries/get_devices.gql
query GetDevices($limit: Int = 10) {
  NetworkDevice(limit: $limit) {
    edges {
      node {
        hostname
        model
        interfaces {
          edges {
            node {
              name
              status
            }
          }
        }
      }
    }
  }
}
```

2. Right-click the query in the Infrahub YAML tree view
3. Select "Execute GraphQL Query"
4. Choose server and branch
5. Fill in any required variables
6. View results in the output panel

### Managing Branches

#### Create a New Branch

1. Open the Infrahub Servers view
2. Right-click on a server
3. Select "New Branch"
4. Enter branch name and description

#### Delete a Branch

1. Expand a server in the tree view to see branches
2. Right-click on a branch
3. Select "Delete Branch"
4. Confirm deletion

### Using .infrahub.yml Files

The extension automatically detects and parses `.infrahub.yml` files in your workspace:

```yaml
# .infrahub.yml
---
schemas:
  - schemas/network.yml
  - schemas/location.yml

queries:
  - name: get_all_devices
    file: queries/devices.gql
  - name: topology_report
    file: queries/topology.gql

checks:
  - name: validate_hostnames
    file: checks/hostname_validator.py
```

Navigate through the structure using the Infrahub YAML tree view.

### Keyboard Shortcuts

While the extension doesn't define default keyboard shortcuts, you can add your own:

1. Open Keyboard Shortcuts (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
2. Search for "Infrahub"
3. Add keybindings for frequently used commands:
   - `infrahub.executeGraphQLQuery`
   - `infrahub.newBranch`
   - `infrahub.editInfrahubYaml`

## Requirements

- Visual Studio Code v1.102.0 or higher
- Active Infrahub server instance (v0.15.0 or higher recommended)
- Valid API token for authentication (optional but recommended)

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `infrahub-vscode.servers` | Array of Infrahub server configurations | `[]` |
| `infrahub-vscode.schemaDirectory` | Directory containing schema files | `"schemas"` |

## Troubleshooting

### Server Connection Issues

- Verify the server address is correct and accessible
- Check API token validity
- Ensure network connectivity to the Infrahub server
- Look for error messages in the status bar

### Schema Validation Not Working

- Confirm files are in the configured schema directory
- Check file extensions (`.yml` or `.yaml`)
- Verify YAML syntax is valid

### GraphQL Queries Not Executing

- Ensure you have selected a valid server and branch
- Check that required variables are provided
- Verify query syntax is valid

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests to the [GitHub repository](https://github.com/opsmill/infrahub-vscode).

## License

This extension is part of the Infrahub project. See the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Infrahub Docs](https://docs.infrahub.app)
- **Issues**: [GitHub Issues](https://github.com/opsmill/infrahub-vscode/issues)
- **Community**: [Infrahub Discord](https://discord.gg/infrahub)

## Acknowledgments

Built with ❤️ by the [OpsMill](https://opsmill.com) team and the Infrahub community.
