# Server Communication

## Overview

The extension communicates with Infrahub servers using the `infrahub-sdk` package. All API calls go through `InfrahubClient` instances created from server configuration.

## Server Configuration

Servers are configured in VSCode settings (`infrahub-vscode.servers`):

```json
{
  "infrahub-vscode.servers": [
    {
      "name": "Production",
      "address": "https://infrahub.example.com",
      "api_token": "${env:INFRAHUB_TOKEN}",
      "tls_insecure": false
    }
  ]
}
```

### Environment Variable Substitution

API tokens support `${env:VAR_NAME}` syntax. The extension resolves these at runtime using `process.env`.

### TLS Configuration

When `tls_insecure: true`, the extension sets `NODE_TLS_REJECT_UNAUTHORIZED=0`. This is global to the Node.js process. See `src/extension.ts` for the TLS setup logic.

## Client Creation

`InfrahubClient` is created via `InfrahubClient.init()` from the SDK. Server tree view provider (`InfrahubServerTreeViewProvider.ts`) creates clients for each configured server.

## API Operations

| Operation | SDK Method | Used In |
|-----------|-----------|---------|
| List branches | `client.branchList()` | Server tree view |
| Create branch | `client.branchCreate()` | `commands.ts` |
| Delete branch | `client.branchDelete()` | `commands.ts` |
| Execute GraphQL | `client.query()` | `commands.ts` |
| Get version | `client.version` | Status bar |
| Visualize schema | `client.schemaAll()` | Schema visualizer |

## Timeout Handling

API calls in the server tree view use a 5-second timeout to keep the UI responsive. If a server is unreachable, it shows as offline with a warning icon.

## Status Bar

The status bar item updates every 10 seconds, showing the first configured server's version or connection status.

## infrahubctl Integration

Some operations (schema check/load, transforms) use `infrahubctl` CLI via terminal execution rather than the SDK. See `common/utilities.ts:executeInfrahubCtl()`.
