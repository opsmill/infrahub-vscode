[1.0.0](https://github.com/opsmill/infrahub/tree/v1.0.0) - 2025-09-04

Initial release

### Added

- Enhance GraphQL query execution by prompting user for server ([#7](https://github.com/opsmill/infrahub-vscode/issues/7))
- Added banner colours and logo. ([#9](https://github.com/opsmill/infrahub-vscode/issues/9))
- Add Python snippets for Infrahub automation scripts ([#14](https://github.com/opsmill/infrahub-vscode/issues/14))
- Added Docs
- Add the ability to check and load schema files.

### Fixed

- Do not store query on TreeItem, but read GraphQL file each execution.
- Fix display to not keep opening new GraphQL result windows if targeting same query, server, and branch.

[0.0.2](https://github.com/opsmill/infrahub/tree/v0.0.2) - 2025-08-22

### Added

- Initial Version containing the following ([#7](https://github.com/opsmill/infrahub-vscode/issues/7)):
  - Infrahub Server tree view (shows servers, status, branches)
  - Infrahub YAML tree view (visualizes .infrahub.yml/.yaml structure)
  - Go to Definition for YAML schema references
  - Document symbols for YAML files (outline support)
  - Edit YAML file from tree view
  - Status bar server info
  - YAML schema validation
  - Workspace configuration for servers and schemas
