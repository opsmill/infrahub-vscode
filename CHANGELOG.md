# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- towncrier release notes start -->

## [1.0.7](https://github.com/opsmill/infrahub-vscode/tree/v1.0.7) - 2025-12-10

### Fixed

- Fix infrahubctl terminal commands not receiving server address and API token environment variables. ([#53](https://github.com/opsmill/infrahub-vscode/issues/53))

## [1.0.6](https://github.com/opsmill/infrahub-vscode/tree/v1.0.6) - 2025-11-07

### Changed

- Use NODE_TLS_REJECT_UNAUTHORIZED environment variable instead of passing TLS options to SDK when tls_insecure is enabled. ([#46](https://github.com/opsmill/infrahub-vscode/issues/46))

## [1.0.5](https://github.com/opsmill/infrahub-vscode/tree/v1.0.5) - 2025-11-07

### Added

- Update SDK from 0.0.6 to 0.0.7 and Added the ability to ignore certificate errors when making requests. ([#43](https://github.com/opsmill/infrahub-vscode/issues/43))

## [1.0.4](https://github.com/opsmill/infrahub-vscode/tree/v1.0.4) - 2025-10-31

### Housekeeping

- Update opsmill icon to new version. ([#40](https://github.com/opsmill/infrahub-vscode/issues/40))

## [1.0.3](https://github.com/opsmill/infrahub-vscode/tree/v1.0.3) - 2025-10-31

### Housekeeping

- Update opsmill icon to new version. ([#40](https://github.com/opsmill/infrahub-vscode/issues/40))

## [1.0.2](https://github.com/opsmill/infrahub-vscode/tree/v1.0.2) - 2025-09-05

### Added

- Added a section for contributing guidelines to the project documentation. ([#contributing](https://github.com/opsmill/infrahub-vscode/issues/contributing))

### Fixed

- - Fixed filewatchers for the `.infrahub.yml|yaml` file to refresh tree view on change/update/delete.
  - Fixed filewatchers for the configured `schemaDirectory` folder to refresh tree view on change/update/delete to any YAML schema files.

  ([#filewatchers](https://github.com/opsmill/infrahub-vscode/issues/filewatchers))
- Fix linting issues. ([#lint](https://github.com/opsmill/infrahub-vscode/issues/lint))
- Allow wider ranges of VSCode versions to accommodate users with different setups. ([#vscode-version](https://github.com/opsmill/infrahub-vscode/issues/vscode-version))

## [1.0.1](https://github.com/opsmill/infrahub-vscode/tree/v1.0.1) - 2025-09-04

### Fixed

- Fixed an issue where the branch management icons (such as new branch and delete branch) were not showing up in the Infrahub server view.


## [1.0.0](https://github.com/opsmill/infrahub-vscode/tree/v1.0.0) - 2025-09-04

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

## [0.0.2](https://github.com/opsmill/infrahub-vscode/tree/v0.0.2) - 2025-08-22

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
